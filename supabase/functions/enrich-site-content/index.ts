import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Brief = {
  businessName: string
  industry: string
  subindustry?: string | null
  location?: string | null
  services: string[]
  goals: string[]
  styleTags: string[]
  requiredCapabilities: string[]
  languages: string[]
  notes?: string | null
}

type AiContent = {
  site_name?: string
  seo?: { title?: string; description?: string; primary_keyword?: string }
  seo_blueprint?: {
    primary_goal?: string
    target_locations?: string[]
    priority_topics?: string[]
    audiences?: string[]
    languages?: string[]
    local_seo?: boolean
    service_pages?: boolean
    location_pages?: boolean
    blog?: boolean
  }
  sections?: Array<{ id: string; props?: Record<string, unknown> }>
  faqs?: Array<{ question: string; answer: string }>
  image_briefs?: Array<{ section_id: string; purpose?: string; prompt?: string; alt?: string }>
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) return json({ error: 'missing_authorization' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) return json({ error: 'unauthorized' }, 401)

    const body = await req.json()
    const workspaceId = string(body.workspace_id)
    const siteId = string(body.site_id)
    const buildId = string(body.build_id) || null
    if (!workspaceId || !siteId) return json({ error: 'workspace_id_and_site_id_required' }, 400)

    const brief = normalizeBrief(body.brief ?? {})
    if (!brief.businessName || !brief.industry) return json({ error: 'business_brief_required' }, 400)

    const { data: draftRows, error: draftError } = await client
      .from('workspace_drafts')
      .select('workspace_id,site_id,revision,snapshot')
      .eq('workspace_id', workspaceId)
      .eq('site_id', siteId)
      .limit(1)
    if (draftError) throw draftError
    const draft = draftRows?.[0]
    if (!draft) return json({ error: 'draft_not_found' }, 404)

    let generated: AiContent
    let mode: 'model' | 'fallback' = 'fallback'
    let usage = { input_tokens: 0, output_tokens: 0 }
    let provider = 'deterministic'
    let model = 'business-brief-v1'
    let metering: unknown = null

    const apiKey = Deno.env.get('MICIRQL_TEXT_API_KEY')
    const baseUrl = Deno.env.get('MICIRQL_TEXT_BASE_URL')
    const configuredModel = Deno.env.get('MICIRQL_TEXT_MODEL')
    const configuredProvider = Deno.env.get('MICIRQL_TEXT_PROVIDER') ?? 'openai-compatible'

    if (apiKey && baseUrl && configuredModel) {
      try {
        const result = await generateWithModel({ apiKey, baseUrl, model: configuredModel, brief, snapshot: draft.snapshot })
        generated = result.content
        usage = result.usage
        provider = configuredProvider
        model = configuredModel
        mode = 'model'
      } catch (error) {
        console.error('model content generation failed; using fallback', error)
        generated = fallbackContent(brief, draft.snapshot)
      }
    } else {
      generated = fallbackContent(brief, draft.snapshot)
    }

    const snapshot = mergeContent(draft.snapshot, generated, brief)
    const { data: saved, error: saveError } = await client.rpc('save_builder_site_draft', {
      p_workspace_id: workspaceId,
      p_site_id: siteId,
      p_expected_revision: Number(draft.revision),
      p_snapshot: snapshot,
      p_updated_by: userData.user.id,
    })
    if (saveError) throw saveError

    if (mode === 'model') {
      const { data: usageData, error: usageError } = await client.rpc('record_ai_usage', {
        p_workspace_id: workspaceId,
        p_site_id: siteId,
        p_build_id: buildId,
        p_task: 'generate-content',
        p_profile_id: `content:${provider}:${model}`,
        p_provider: provider,
        p_model: model,
        p_input_tokens: usage.input_tokens,
        p_output_tokens: usage.output_tokens,
        p_images: 0,
        p_component_generations: 0,
      })
      if (!usageError) metering = usageData
      else console.warn('usage metering skipped', usageError.message)
    }

    return json({
      ok: true,
      mode,
      provider,
      model,
      usage,
      metering,
      draft: saved,
      content: generated,
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'content_enrichment_failed' }, 400)
  }
})

async function generateWithModel(args: { apiKey: string; baseUrl: string; model: string; brief: Brief; snapshot: any }) {
  const endpoint = args.baseUrl.replace(/\/$/, '').endsWith('/chat/completions')
    ? args.baseUrl.replace(/\/$/, '')
    : `${args.baseUrl.replace(/\/$/, '')}/chat/completions`
  const sectionShape = Array.isArray(args.snapshot?.pages?.[0]?.sections)
    ? args.snapshot.pages[0].sections.map((section: any) => ({ id: section.id, componentId: section.component?.componentId, currentProps: section.props }))
    : []

  const system = `You create concise, production-ready website content from a structured business brief. Return JSON only. Never invent awards, years of experience, prices, medical success rates, certifications, addresses, testimonials, guarantees, or factual claims not present in the brief. For medical/clinic businesses, use informational and non-diagnostic language. Preserve the supplied section IDs exactly. SEO title must be <=70 characters and description <=180 characters. Generate useful image briefs but do not claim images already exist. Output shape: {"site_name":"string","seo":{"title":"string","description":"string","primary_keyword":"string"},"seo_blueprint":{"primary_goal":"string","target_locations":["string"],"priority_topics":["string"],"audiences":["string"],"languages":["string"],"local_seo":true,"service_pages":true,"location_pages":false,"blog":false},"sections":[{"id":"existing-id","props":{}}],"faqs":[{"question":"string","answer":"string"}],"image_briefs":[{"section_id":"existing-id","purpose":"string","prompt":"string","alt":"string"}]}.`
  const user = JSON.stringify({ brief: args.brief, sections: sectionShape })

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${args.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: args.model,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!response.ok) throw new Error(`text_provider_failed_${response.status}`)
  const payload = await response.json()
  const raw = payload?.choices?.[0]?.message?.content
  if (typeof raw !== 'string') throw new Error('text_provider_invalid_response')
  const content = JSON.parse(stripFence(raw)) as AiContent
  return {
    content,
    usage: {
      input_tokens: Number(payload?.usage?.prompt_tokens ?? payload?.usage?.input_tokens ?? 0),
      output_tokens: Number(payload?.usage?.completion_tokens ?? payload?.usage?.output_tokens ?? 0),
    },
  }
}

function fallbackContent(brief: Brief, snapshot: any): AiContent {
  const locationSuffix = brief.location ? ` in ${brief.location}` : ''
  const cleanServices = brief.industry.toLowerCase().includes('dental')
    ? brief.services.filter((service) => !/pediatric|paediatric/i.test(service))
    : brief.services
  const firstService = cleanServices[0] || brief.subindustry || brief.industry
  const sections = Array.isArray(snapshot?.pages?.[0]?.sections) ? snapshot.pages[0].sections : []
  const sectionContent = sections.map((section: any) => {
    const family = sectionFamily(section?.component?.componentId)
    if (family === 'hero') {
      return { id: section.id, props: {
        eyebrow: brief.location || title(brief.industry),
        title: truncate(`${brief.businessName}: ${title(firstService)}${locationSuffix}`, 70),
        description: `Explore ${cleanServices.length ? cleanServices.join(', ') : brief.industry} with clear information and an easy way to get in touch.`,
        primaryAction: { href: '#contact', label: brief.goals.some((goal) => /book|appointment|reserve|reservation/i.test(goal)) ? 'Book an appointment' : 'Get in touch' },
      } }
    }
    if (family === 'services') {
      return { id: section.id, props: {
        title: brief.industry.toLowerCase().includes('restaurant') ? 'A menu worth lingering over.' : 'Services',
        description: `Explore ${brief.industry} services in a clear, easy-to-scan format before contacting the team.`,
        items: cleanServices.slice(0, 8).map((service) => ({ title: title(service), description: serviceDescription(service, brief) })),
      } }
    }
    if (family === 'contact') {
      return { id: section.id, props: {
        title: contactTitle(brief),
        description: brief.location ? `Tell ${brief.businessName} what you are looking for and how the team can help in ${brief.location}.` : `Tell ${brief.businessName} what you are looking for and how the team can help.`,
        primaryAction: { href: '#contact-form', label: contactActionLabel(brief) },
      } }
    }
    if (family === 'about') {
      return { id: section.id, props: {
        title: 'A clearer first conversation.',
        description: brief.notes || `${brief.businessName} makes it easier to understand ${title(brief.industry).toLowerCase()} options before deciding on a next step.`,
        items: [
          { title: 'Useful context', description: 'Start with clear information about the services and questions that matter to you.' },
          { title: 'Considered next steps', description: `Contact ${brief.businessName} for details relevant to your situation.` },
        ],
      } }
    }
    if (family === 'features') {
      return { id: section.id, props: {
        title: 'Built around a better first impression.',
        description: 'The essentials visitors need to understand the offer and take the next step.',
        items: [
          { title: 'Clear information', description: 'Understand the available options, process, and next steps.' },
          { title: 'Thoughtful guidance', description: 'Get practical direction based on your goals and requirements.' },
          { title: 'Easy to connect', description: `Reach ${brief.businessName} when you are ready to discuss your needs.` },
        ],
      } }
    }
    if (family === 'process') {
      return { id: section.id, props: {
        title: 'A simple path forward.',
        description: 'A clear sequence makes the first enquiry feel straightforward.',
        items: [
          { title: 'Explore', description: `Review ${cleanServices.length ? cleanServices.slice(0, 3).join(', ') : brief.industry} and the information most relevant to you.` },
          { title: 'Ask', description: 'Use the enquiry path to share what you need and any questions you have.' },
          { title: 'Continue', description: `${brief.businessName} can confirm the appropriate next step.` },
        ],
      } }
    }
    if (family === 'testimonials') {
      return { id: section.id, props: {
        title: 'Client perspective',
        description: 'Add verified feedback from real customers here. This section remains intentionally unclaimed until approved testimonials are provided.',
        body: 'Add verified feedback from real customers here. This section remains intentionally unclaimed until approved testimonials are provided.',
        items: [],
      } }
    }
    if (family === 'gallery') {
      return { id: section.id, props: {
        title: 'Featured highlights',
        description: `Show the work, space, products, or moments that best represent ${brief.businessName}.`,
        items: [],
      } }
    }
    if (family === 'team') {
      return { id: section.id, props: {
        title: 'Meet the people',
        description: `Introduce the people behind ${brief.businessName} using only approved names, roles, and biographies.`,
        items: [],
      } }
    }
    if (family === 'cta') {
      return { id: section.id, props: {
        title: 'Ready when you are.',
        description: brief.goals.some((goal) => /book|appointment|reserve|reservation/i.test(goal)) ? `Request an appointment with ${brief.businessName} and take the next step with clarity.` : `Get in touch with ${brief.businessName} when you are ready to continue.`,
        primaryAction: { href: '#contact', label: contactActionLabel(brief) },
      } }
    }
    return { id: section.id, props: { title: title(family || 'More information'), description: `Explore what ${brief.businessName} offers and contact the team for details.` } }
  })

  const keyword = `${firstService}${brief.location ? ` ${brief.location}` : ''}`.trim()
  const titleText = truncate(`${brief.businessName} | ${title(firstService)}${locationSuffix}`, 70)
  const description = truncate(`${brief.businessName} provides ${cleanServices.length ? cleanServices.join(', ') : brief.industry}${locationSuffix}. Explore services and contact the team for more information.`, 180)
  return {
    site_name: brief.businessName,
    seo: { title: titleText, description, primary_keyword: keyword },
    seo_blueprint: {
      primary_goal: brief.goals[0] || 'Present the business clearly and convert visitors',
      target_locations: brief.location ? [brief.location] : [],
      priority_topics: cleanServices,
      audiences: [],
      languages: brief.languages.length ? brief.languages : ['en'],
      local_seo: Boolean(brief.location),
      service_pages: true,
      location_pages: false,
      blog: brief.requiredCapabilities.some((item) => /blog/i.test(item)),
    },
    sections: sectionContent,
    faqs: cleanServices.slice(0, 4).map((service) => ({ question: `What should I know about ${service}?`, answer: `Contact ${brief.businessName} for information about ${service}, suitability, process, and next steps for your situation.` })),
    image_briefs: sections.map((section: any) => ({
      section_id: section.id,
      purpose: 'Website section visual',
      prompt: `Professional ${brief.industry} website photography for ${brief.businessName}${brief.location ? ` in ${brief.location}` : ''}; suitable for a ${sectionFamily(section?.component?.componentId) || 'section'} section; authentic, clean, no text embedded in image.`,
      alt: `${brief.businessName} ${sectionFamily(section?.component?.componentId) || 'website'} visual`,
    })),
  }
}

function mergeContent(snapshot: any, content: AiContent, brief: Brief) {
  const next = structuredClone(snapshot)
  next.name = nonEmpty(content.site_name) || brief.businessName || next.name
  if (!next.seoBlueprint) next.seoBlueprint = {}
  const seoBlueprint = content.seo_blueprint ?? {}
  next.seoBlueprint.primaryGoal = nonEmpty(seoBlueprint.primary_goal) || next.seoBlueprint.primaryGoal || brief.goals[0] || 'Present the business clearly and convert visitors'
  next.seoBlueprint.targetLocations = stringArray(seoBlueprint.target_locations).length ? stringArray(seoBlueprint.target_locations) : (brief.location ? [brief.location] : [])
  next.seoBlueprint.priorityTopics = stringArray(seoBlueprint.priority_topics).length ? stringArray(seoBlueprint.priority_topics) : brief.services
  next.seoBlueprint.audiences = stringArray(seoBlueprint.audiences)
  next.seoBlueprint.languages = stringArray(seoBlueprint.languages).length ? stringArray(seoBlueprint.languages) : (brief.languages.length ? brief.languages : ['en'])
  next.seoBlueprint.localSeo = Boolean(seoBlueprint.local_seo ?? brief.location)
  next.seoBlueprint.servicePages = seoBlueprint.service_pages !== false
  next.seoBlueprint.locationPages = Boolean(seoBlueprint.location_pages)
  next.seoBlueprint.blog = Boolean(seoBlueprint.blog ?? brief.requiredCapabilities.some((item) => /blog/i.test(item)))

  const page = next.pages?.[0]
  if (page) {
    page.seo = page.seo ?? {}
    page.seo.title = truncate(nonEmpty(content.seo?.title) || page.seo.title || next.name, 70)
    page.seo.description = truncate(nonEmpty(content.seo?.description) || page.seo.description || `${next.name} website`, 180)
    page.seo.canonicalPath = page.seo.canonicalPath || '/'
    page.seo.indexable = page.seo.indexable !== false
    page.seo.structuredDataTypes = Array.isArray(page.seo.structuredDataTypes) ? page.seo.structuredDataTypes : []
    const keyword = nonEmpty(content.seo?.primary_keyword)
    if (keyword) page.seo.primaryKeyword = keyword

    const byId = new Map((content.sections ?? []).filter((item) => item?.id).map((item) => [item.id, item]))
    const imageById = new Map((content.image_briefs ?? []).filter((item) => item?.section_id).map((item) => [item.section_id, item]))
    for (const section of page.sections ?? []) {
      const generated = byId.get(section.id)
      if (generated?.props && typeof generated.props === 'object' && !Array.isArray(generated.props)) {
        section.props = normalizeSectionProps(section.props ?? {}, generated.props, section.component?.componentId, brief, next.name)
      }
      const imageBrief = imageById.get(section.id)
      if (imageBrief) section.props = { ...(section.props ?? {}), imageBrief }
      if (Array.isArray(content.faqs) && content.faqs.length && sectionFamily(section.component?.componentId) === 'services') {
        section.props = { ...(section.props ?? {}), faqs: content.faqs.slice(0, 8) }
      }
    }
    ensureUniqueHeadings(page.sections ?? [])
  }
  return next
}

function ensureUniqueHeadings(sections: any[]) {
  const counts = new Map<string, number>()
  const alternatives: Record<string, string[]> = {
    about: ['Our approach', 'What guides us', 'Why it matters'],
    services: ['Our capabilities', 'Explore our work', 'How we can help'],
    features: ['The difference we bring', 'What sets us apart', 'Built around your needs'],
    process: ['What to expect', 'How it comes together', 'A clear path forward'],
    testimonials: ['Client perspective', 'In their words', 'Trusted experiences'],
    gallery: ['Featured highlights', 'A closer look', 'Selected work'],
    team: ['Meet the people', 'Our team', 'The people behind the work'],
    contact: ['Start a conversation', 'Get in touch', 'Contact the team'],
    cta: ['Take the next step', 'Let’s begin', 'Ready when you are'],
  }
  for (const section of sections) {
    const props = section?.props
    if (!props || typeof props !== 'object' || Array.isArray(props)) continue
    const key = typeof props.heading === 'string' && props.heading.trim() ? 'heading' : typeof props.title === 'string' && props.title.trim() ? 'title' : null
    if (!key) continue
    const original = String(props[key]).trim()
    const normalized = original.toLowerCase()
    const occurrence = counts.get(normalized) ?? 0
    counts.set(normalized, occurrence + 1)
    if (occurrence === 0) continue
    const component = sectionFamily(section?.component?.componentId)
    const replacement = component ? alternatives[component]?.find((candidate) => !counts.has(candidate.toLowerCase())) : undefined
    if (replacement) {
      props[key] = replacement
      counts.set(replacement.toLowerCase(), 1)
    } else {
      props[key] = `${original} — ${occurrence + 1}`
    }
  }
}

function normalizeSectionProps(existing: Record<string, unknown>, generated: Record<string, unknown>, componentId: unknown, brief: Brief, snapshotName: string) {
  const merged = { ...existing, ...generated }
  const family = sectionFamily(componentId)
  const heading = nonEmpty(generated.heading)
  const body = nonEmpty(generated.body)
  if (!nonEmpty(merged.title) && heading) merged.title = heading
  if (!nonEmpty(merged.description) && body) merged.description = body
  const ctaLabel = nonEmpty(generated.ctaLabel)
  if (ctaLabel) {
    const current = merged.primaryAction && typeof merged.primaryAction === 'object' && !Array.isArray(merged.primaryAction) ? merged.primaryAction as Record<string, unknown> : {}
    merged.primaryAction = { ...current, href: nonEmpty(current.href) || '#contact', label: ctaLabel }
  }
  if (family === 'hero' && isPlaceholderCopy(merged.title, snapshotName)) merged.title = heroTitle(brief)
  if (family === 'hero' && isGenericCopy(merged.description)) merged.description = heroDescription(brief)
  if (family === 'hero') {
    const secondary = merged.secondaryAction && typeof merged.secondaryAction === 'object' && !Array.isArray(merged.secondaryAction) ? merged.secondaryAction as Record<string, unknown> : {}
    merged.secondaryAction = { ...secondary, href: '#services', label: secondaryActionLabel(brief) }
  }
  if (family === 'services' && Array.isArray(merged.items)) {
    merged.items = merged.items.map((item: any) => ({ ...item, description: isGenericCopy(item?.description) ? serviceDescription(String(item?.title ?? ''), brief) : item?.description }))
  }
  if (family === 'contact' && isPlaceholderCopy(merged.title, snapshotName)) merged.title = contactTitle(brief)
  delete merged.heading
  delete merged.body
  delete merged.ctaLabel
  return merged
}

function sectionFamily(value: unknown): string | null {
  const component = String(value ?? '').trim()
  const legacy = component.toLowerCase().split('.')[0]
  if (['navbar', 'hero', 'about', 'services', 'features', 'process', 'testimonials', 'gallery', 'team', 'cta', 'contact', 'footer'].includes(legacy)) return legacy
  const match = component.toUpperCase().match(/-(NAV|HERO|ABOUT|SERV|FEAT|PROC|TEST|GALL|TEAM|CTA|CONT|FOOT)-/)
  const families: Record<string, string> = { NAV: 'navbar', HERO: 'hero', ABOUT: 'about', SERV: 'services', FEAT: 'features', PROC: 'process', TEST: 'testimonials', GALL: 'gallery', TEAM: 'team', CTA: 'cta', CONT: 'contact', FOOT: 'footer' }
  return match ? families[match[1]] || null : null
}

function heroTitle(brief: Brief) {
  const firstService = brief.services[0] || brief.subindustry || brief.industry || 'your next step'
  return truncate(`${brief.businessName}: ${title(firstService)}${brief.location ? ` in ${brief.location}` : ''}`, 70)
}
function heroDescription(brief: Brief) {
  const services = brief.services.length ? brief.services.join(', ') : brief.industry
  return `Explore ${services} with clear information and an easy way to get in touch with ${brief.businessName}.`
}
function contactTitle(brief: Brief) {
  return /restaurant|hospitality|dining/i.test(`${brief.industry} ${brief.subindustry ?? ''}`) ? 'Reserve your table.' : `Start a conversation with ${brief.businessName}.`
}
function contactActionLabel(brief: Brief) {
  return /restaurant|hospitality|dining/i.test(`${brief.industry} ${brief.subindustry ?? ''}`) ? 'Reserve a table' : brief.goals.some((goal) => /book|appointment/i.test(goal)) ? 'Book an appointment' : 'Get in touch'
}
function secondaryActionLabel(brief: Brief) {
  const context = `${brief.industry} ${brief.subindustry ?? ''}`
  if (/restaurant|hospitality|dining/i.test(context)) return 'View the menu'
  if (/real estate|property/i.test(context)) return 'Explore properties'
  if (/construction|contractor/i.test(context)) return 'View projects'
  if (/dental|clinic|dentist/i.test(context)) return 'Explore treatments'
  return 'Explore services'
}
function serviceDescription(service: string, brief: Brief) {
  const cleaned = service.trim() || 'this service'
  if (/restaurant|hospitality|dining/i.test(`${brief.industry} ${brief.subindustry ?? ''}`)) return `Explore ${cleaned.toLowerCase()} and ask the team about the current offering.`
  return `Learn about ${cleaned.toLowerCase()} and contact ${brief.businessName} for details relevant to your needs.`
}
function isPlaceholderCopy(value: unknown, snapshotName: string) {
  const text = nonEmpty(value)
  return !text || text.toLowerCase() === snapshotName.trim().toLowerCase() || /^(?:[a-z]{3,4})[ -](?:hero|serv|about|proc|test|cta|cont|feat|gall|team|nav|foot)\s*\d{3}$/i.test(text)
}
function isGenericCopy(value: unknown) {
  const text = nonEmpty(value).toLowerCase()
  return !text || text === 'build trust' || text.includes('review the information supplied by the business') || text.includes('explore what ') && text.includes('offers and contact the team for details')
}

function normalizeBrief(value: any): Brief {
  return {
    businessName: string(value.businessName ?? value.business_name),
    industry: string(value.industry),
    subindustry: optional(value.subindustry),
    location: optional(value.location),
    services: stringArray(value.services),
    goals: stringArray(value.goals),
    styleTags: stringArray(value.styleTags ?? value.style_tags),
    requiredCapabilities: stringArray(value.requiredCapabilities ?? value.required_capabilities),
    languages: stringArray(value.languages).length ? stringArray(value.languages) : ['en'],
    notes: optional(value.notes),
  }
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
function string(value: unknown) { return typeof value === 'string' ? value.trim() : '' }
function optional(value: unknown) { const result = string(value); return result || null }
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.map(string).filter(Boolean) : [] }
function nonEmpty(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : '' }
function truncate(value: string, max: number) { return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…` }
function title(value: string) { return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) }
function stripFence(value: string) { return value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '') }
