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

type AiSeo = {
  title?: string
  description?: string
  primary_keyword?: string
}

type AiSectionContent = {
  id: string
  props?: Record<string, unknown>
}

type AiFaq = {
  question: string
  answer: string
}

type AiImageBrief = {
  section_id: string
  purpose?: string
  prompt?: string
  alt?: string
}

type AiPageContent = {
  id: string
  seo?: AiSeo
  sections?: AiSectionContent[]
  faqs?: AiFaq[]
  image_briefs?: AiImageBrief[]
}

type AiContent = {
  site_name?: string
  pages?: AiPageContent[]
  // Legacy single-page fields remain accepted so a stale provider response can be
  // completed deterministically instead of dropping content for the other pages.
  seo?: AiSeo
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
  sections?: AiSectionContent[]
  faqs?: AiFaq[]
  image_briefs?: AiImageBrief[]
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) return json({ error: 'missing_authorization' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) return json({ error: 'unauthorized' }, 401)

    const body = await req.json()
    const workspaceId = string(body.workspace_id)
    const siteId = string(body.site_id)
    const buildId = string(body.build_id) || null
    if (!workspaceId || !siteId) return json({ error: 'workspace_id_and_site_id_required' }, 400)

    const brief = normalizeBrief(body.brief ?? {})
    if (!brief.businessName || !brief.industry) return json({ error: 'business_brief_required' }, 400)

    const { data: draftRows, error: draftError } = await client.from('workspace_drafts').select('workspace_id,site_id,revision,snapshot').eq('workspace_id', workspaceId).eq('site_id', siteId).limit(1)
    if (draftError) throw draftError
    const draft = draftRows?.[0]
    if (!draft) return json({ error: 'draft_not_found' }, 404)

    let generated: AiContent
    let mode: 'model' | 'fallback' = 'fallback'
    let usage = { input_tokens: 0, output_tokens: 0 }
    let provider = 'deterministic'
    let model = 'business-brief-v1'
    let metering: unknown = null

    const deterministic = fallbackContent(brief, draft.snapshot)

    try {
      const result = await generateWithGateway({ authorization, supabaseUrl, anonKey, brief, snapshot: draft.snapshot, deterministic })
      generated = result.content
      usage = result.usage
      provider = result.provider
      model = result.model
      mode = 'model'
    } catch (error) {
      console.error('gateway content generation failed; using fallback', error)
      generated = deterministic
    }

    generated = completeContentCoverage(generated, deterministic, draft.snapshot)

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
    return json(
      {
        error: error instanceof Error ? error.message : 'content_enrichment_failed',
      },
      400,
    )
  }
})

async function generateWithGateway(args: { authorization: string; supabaseUrl: string; anonKey: string; brief: Brief; snapshot: any; deterministic: AiContent }) {
  const results = await Promise.all(sitePages(args.snapshot).map((page: any) => generatePageWithGateway(args, page)))
  if (!results.length) throw new Error('gateway_content_pages_missing')
  const providers = [...new Set(results.map((result) => result.provider))]
  const models = [...new Set(results.map((result) => result.model))]
  return {
    content: {
      site_name: args.brief.businessName,
      seo_blueprint: args.deterministic.seo_blueprint,
      pages: results.map((result) => result.page),
    } satisfies AiContent,
    provider: providers.length === 1 ? providers[0]! : `gateway:${providers.join('+')}`,
    model: models.length === 1 ? models[0]! : models.join('+'),
    usage: results.reduce(
      (total, result) => ({ input_tokens: total.input_tokens + result.usage.input_tokens, output_tokens: total.output_tokens + result.usage.output_tokens }),
      { input_tokens: 0, output_tokens: 0 },
    ),
  }
}

async function generatePageWithGateway(
  args: { authorization: string; supabaseUrl: string; anonKey: string; brief: Brief; snapshot: any },
  page: any,
) {
  const system = `You create concise, production-ready website content for one supplied page from a structured business brief. Return JSON only.
Use every supplied section. Preserve the page ID and every section ID exactly and never add, remove, or rename IDs. Write distinct, page-appropriate headings instead of repeating home-page copy.
Never invent awards, years of experience, prices, availability, medical success rates, clinician names, credentials, addresses, phone numbers, email addresses, reviews, testimonials, certifications, guarantees, or other factual claims not present in the brief or current props. For medical or clinic businesses, use informational, non-diagnostic language and describe appointments as requests until confirmed. Do not generate testimonial or team members.
Only write content props, page SEO, FAQs, and image briefs. Do not output code, CSS, component IDs, layouts, bindings, navigation, brand tokens, assets, integration configuration, or generation metadata. Preserve action destinations and existing factual values. SEO titles must be <=70 characters and descriptions <=180 characters. Generate one useful image brief for every existing section but do not claim an image already exists.
Keep copy compact enough to fit the supplied component slots. Output shape: {"id":"existing-page-id","seo":{"title":"string","description":"string","primary_keyword":"string"},"sections":[{"id":"existing-section-id","props":{}}],"faqs":[{"question":"string","answer":"string"}],"image_briefs":[{"section_id":"existing-section-id","purpose":"string","prompt":"string","alt":"string"}]}.`
  const input = {
    brief: args.brief,
    page: {
      id: page.id,
      path: page.path,
      name: page.name,
      currentSeo: page.seo,
      sections: siteSections(page).map((section: any) => ({
        id: section.id,
        componentId: section.component?.componentId,
        currentProps: contentInputProps(section.props),
      })),
    },
  }

  const response = await fetch(`${args.supabaseUrl.replace(/\/$/, '')}/functions/v1/ai-gateway`, {
    method: 'POST',
    headers: {
      Authorization: args.authorization,
      apikey: args.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task: 'content',
      system,
      input,
      response_format: 'json',
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(string(payload?.error) || `gateway_http_${response.status}`)
  if (!isRecord(payload?.content)) throw new Error('gateway_content_invalid_response')
  const returnedPage = payload.content as unknown as AiPageContent
  if (string(returnedPage.id) !== string(page.id)) throw new Error('gateway_content_page_id_mismatch')
  return {
    page: returnedPage,
    provider: string(payload.provider) || 'ai-gateway',
    model: string(payload.model) || 'configured-model',
    usage: {
      input_tokens: Number(payload?.usage?.input_tokens ?? 0) || 0,
      output_tokens: Number(payload?.usage?.output_tokens ?? 0) || 0,
    },
  }
}

function contentInputProps(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {}
  const result: Record<string, unknown> = {}
  for (const key of ['eyebrow', 'kicker', 'title', 'heading', 'subtitle', 'subheading', 'description', 'body', 'label', 'caption']) {
    const text = nonEmpty(value[key])
    if (text) result[key] = truncate(text, 500)
  }
  for (const key of ['primaryAction', 'secondaryAction']) {
    const action = value[key]
    if (!isRecord(action)) continue
    const label = nonEmpty(action.label)
    const href = nonEmpty(action.href)
    if (label || href) result[key] = { ...(label ? { label } : {}), ...(href ? { href } : {}) }
  }
  if (Array.isArray(value.items)) {
    result.items = value.items.slice(0, 8).flatMap((item) => {
      if (!isRecord(item)) return []
      const compact: Record<string, string> = {}
      for (const key of ['title', 'description', 'body', 'label', 'caption']) {
        const text = nonEmpty(item[key])
        if (text) compact[key] = truncate(text, 300)
      }
      return Object.keys(compact).length ? [compact] : []
    })
  }
  return result
}

function fallbackContent(brief: Brief, snapshot: any): AiContent {
  const locationSuffix = brief.location ? ` in ${brief.location}` : ''
  const cleanServices = brief.services
  const firstService = cleanServices[0] || brief.subindustry || brief.industry
  const pages = sitePages(snapshot).map((page: any, pageIndex: number) => fallbackPageContent(brief, page, pageIndex))
  return {
    site_name: brief.businessName,
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
    pages,
    // Keep the first-page fields for compatibility with callers that still inspect
    // the original single-page response shape. The merge path uses `pages`.
    seo: pages[0]?.seo ?? {
      title: truncate(`${brief.businessName} | ${title(firstService)}${locationSuffix}`, 70),
      description: truncate(
        `${brief.businessName} provides ${cleanServices.length ? cleanServices.join(', ') : brief.industry}${locationSuffix}. Explore services and contact the team for more information.`,
        180,
      ),
      primary_keyword: `${firstService}${locationSuffix}`.trim(),
    },
    sections: pages[0]?.sections ?? [],
    faqs: pages[0]?.faqs ?? [],
    image_briefs: pages[0]?.image_briefs ?? [],
  }
}

function fallbackPageContent(brief: Brief, page: any, pageIndex: number): AiPageContent {
  const sections = siteSections(page)
  const pageName = nonEmpty(page?.name) || `Page ${pageIndex + 1}`
  const pagePath = nonEmpty(page?.path) || (pageIndex === 0 ? '/' : `/${slug(pageName)}`)
  const pageTopic = topicForPage(page, brief)
  const locationSuffix = brief.location ? ` in ${brief.location}` : ''
  const sectionContent = sections.map((section: any) => fallbackSectionContent(brief, page, section))
  const description = truncate(pageDescription(page, brief), 180)
  const seoTitle = truncate(pagePath === '/' ? `${brief.businessName} | ${title(pageTopic)}${locationSuffix}` : `${pageName} | ${brief.businessName}`, 70)
  const keyword = `${pageTopic}${brief.location ? ` ${brief.location}` : ''}`.trim()

  return {
    id: String(page?.id ?? ''),
    seo: { title: seoTitle, description, primary_keyword: keyword },
    sections: sectionContent,
    faqs: fallbackFaqs(page, brief),
    image_briefs: sections.map((section: any) => fallbackImageBrief(page, section, brief)),
  }
}

function fallbackSectionContent(brief: Brief, page: any, section: any): AiSectionContent {
  const id = String(section?.id ?? '')
  const family = sectionFamily(section?.component?.componentId)
  if (family === 'hero') {
    return {
      id,
      props: {
        eyebrow: brief.location || nonEmpty(page?.name) || title(brief.industry),
        title: heroTitleForPage(page, brief),
        description: pageDescription(page, brief),
        primaryAction: { label: contactActionLabel(brief) },
      },
    }
  }
  if (family === 'services') {
    return {
      id,
      props: {
        title: servicesHeading(page, brief),
        description: `Explore ${brief.industry} services in a clear, easy-to-scan format before contacting the team.`,
        items: brief.services.slice(0, 8).map((service) => ({
          title: service,
          description: serviceDescription(service, brief),
        })),
      },
    }
  }
  if (family === 'contact') {
    return {
      id,
      props: {
        title: isContactPage(page) ? contactActionLabel(brief) : contactTitle(brief),
        description: brief.location
          ? `Tell ${brief.businessName} what you are looking for and how the team can help in ${brief.location}.`
          : `Tell ${brief.businessName} what you are looking for and how the team can help.`,
        primaryAction: { label: contactActionLabel(brief) },
      },
    }
  }
  if (family === 'about') {
    return {
      id,
      props: {
        title: isAboutPage(page) ? `About ${brief.businessName}` : 'A clearer first conversation.',
        description: brief.notes || `${brief.businessName} makes it easier to understand ${title(brief.industry).toLowerCase()} options before deciding on a next step.`,
        items: [
          {
            title: 'Useful context',
            description: 'Start with clear information about the services and questions that matter to you.',
          },
          {
            title: 'Considered next steps',
            description: `Contact ${brief.businessName} for details relevant to your situation.`,
          },
        ],
      },
    }
  }
  if (family === 'features') {
    return {
      id,
      props: {
        title: isAboutPage(page) ? 'What guides the experience' : 'Built around a better first impression.',
        description: 'The essentials visitors need to understand the offer and take the next step.',
        items: [
          {
            title: 'Clear information',
            description: 'Understand the available options, process, and next steps.',
          },
          {
            title: 'Thoughtful guidance',
            description: 'Get practical direction based on your goals and requirements.',
          },
          {
            title: 'Easy to connect',
            description: `Reach ${brief.businessName} when you are ready to discuss your needs.`,
          },
        ],
      },
    }
  }
  if (family === 'process') {
    return {
      id,
      props: {
        title: isContactPage(page) ? 'What happens after your request' : 'A simple path forward.',
        description: 'A clear sequence makes the first enquiry feel straightforward.',
        items: [
          {
            title: 'Explore',
            description: `Review ${brief.services.length ? brief.services.slice(0, 3).join(', ') : brief.industry} and the information most relevant to you.`,
          },
          {
            title: 'Ask',
            description: 'Use the enquiry path to share what you need and any questions you have.',
          },
          {
            title: 'Continue',
            description: `${brief.businessName} can confirm the appropriate next step.`,
          },
        ],
      },
    }
  }
  if (family === 'testimonials') {
    return {
      id,
      props: {
        title: isTeamPage(page) ? 'Verified patient feedback' : 'Client perspective',
        description: 'Add verified feedback from real customers here. This section remains intentionally unclaimed until approved testimonials are provided.',
        body: 'Add verified feedback from real customers here. This section remains intentionally unclaimed until approved testimonials are provided.',
        items: [],
      },
    }
  }
  if (family === 'gallery') {
    return {
      id,
      props: {
        title: `A closer look at ${brief.businessName}`,
        description: `Show the work, space, products, or moments that best represent ${brief.businessName}.`,
        items: [],
      },
    }
  }
  if (family === 'team') {
    return {
      id,
      props: {
        title: isTeamPage(page) ? 'Meet the dental team' : 'Meet the people',
        description: `Introduce the people behind ${brief.businessName} using only approved names, roles, and biographies.`,
        items: [],
      },
    }
  }
  if (family === 'cta') {
    return {
      id,
      props: {
        title: isContactPage(page) ? 'Send your appointment request' : 'Ready when you are.',
        description: brief.goals.some((goal) => /book|appointment|reserve|reservation/i.test(goal))
          ? `Request an appointment with ${brief.businessName} and take the next step with clarity.`
          : `Get in touch with ${brief.businessName} when you are ready to continue.`,
        primaryAction: { label: contactActionLabel(brief) },
      },
    }
  }
  if (family === 'navbar') {
    return { id, props: { title: brief.businessName } }
  }
  if (family === 'footer') {
    return {
      id,
      props: {
        title: brief.businessName,
        description: `${title(brief.industry)} information and a clear way to contact ${brief.businessName}.`,
      },
    }
  }
  return {
    id,
    props: {
      title: `${title(family || 'More information')} for ${nonEmpty(page?.name) || brief.businessName}`,
      description: `Explore what ${brief.businessName} offers and contact the team for details.`,
    },
  }
}

function completeContentCoverage(generated: AiContent, deterministic: AiContent, snapshot: any): AiContent {
  const deterministicPages = new Map((deterministic.pages ?? []).filter((page) => page?.id).map((page) => [page.id, page]))
  const generatedPages = new Map((generated.pages ?? []).filter((page) => page?.id).map((page) => [page.id, page]))
  const sourcePages = sitePages(snapshot)

  if (!generatedPages.size && sourcePages[0]) {
    generatedPages.set(String(sourcePages[0].id), {
      id: String(sourcePages[0].id),
      seo: generated.seo,
      sections: generated.sections,
      faqs: generated.faqs,
      image_briefs: generated.image_briefs,
    })
  }

  const pages = sourcePages.map((sourcePage: any) => {
    const id = String(sourcePage.id)
    const fallbackPage = deterministicPages.get(id) ?? {
      id,
      sections: [],
      faqs: [],
      image_briefs: [],
    }
    const generatedPage = generatedPages.get(id)
    const validSectionIds = new Set(siteSections(sourcePage).map((section: any) => String(section.id)))
    const generatedSections = new Map((generatedPage?.sections ?? []).filter((section) => section?.id && validSectionIds.has(String(section.id))).map((section) => [String(section.id), section]))
    const generatedImages = new Map(
      (generatedPage?.image_briefs ?? []).filter((image) => image?.section_id && validSectionIds.has(String(image.section_id))).map((image) => [String(image.section_id), image]),
    )

    return {
      id,
      seo: { ...(fallbackPage.seo ?? {}), ...(generatedPage?.seo ?? {}) },
      sections: (fallbackPage.sections ?? []).map((fallbackSection) => {
        const modelSection = generatedSections.get(String(fallbackSection.id))
        return {
          id: fallbackSection.id,
          props: {
            ...(isRecord(fallbackSection.props) ? fallbackSection.props : {}),
            ...(isRecord(modelSection?.props) ? modelSection?.props : {}),
          },
        }
      }),
      faqs: validFaqs(generatedPage?.faqs).length ? validFaqs(generatedPage?.faqs) : (fallbackPage.faqs ?? []),
      image_briefs: (fallbackPage.image_briefs ?? []).map((fallbackImage) => ({
        ...fallbackImage,
        ...(generatedImages.get(String(fallbackImage.section_id)) ?? {}),
        section_id: fallbackImage.section_id,
      })),
    }
  })

  return {
    site_name: nonEmpty(generated.site_name) || deterministic.site_name,
    seo_blueprint: {
      ...(deterministic.seo_blueprint ?? {}),
      ...(generated.seo_blueprint ?? {}),
    },
    pages,
    seo: pages[0]?.seo,
    sections: pages[0]?.sections,
    faqs: pages[0]?.faqs,
    image_briefs: pages[0]?.image_briefs,
  }
}

function mergeContent(snapshot: any, content: AiContent, brief: Brief) {
  const next = structuredClone(snapshot)
  next.name = brief.businessName || next.name
  if (!next.seoBlueprint) next.seoBlueprint = {}
  const seoBlueprint = content.seo_blueprint ?? {}
  next.seoBlueprint.primaryGoal = nonEmpty(seoBlueprint.primary_goal) || next.seoBlueprint.primaryGoal || brief.goals[0] || 'Present the business clearly and convert visitors'
  next.seoBlueprint.targetLocations = brief.location ? [brief.location] : stringArray(next.seoBlueprint.targetLocations)
  next.seoBlueprint.priorityTopics = brief.services.length ? [...brief.services] : stringArray(next.seoBlueprint.priorityTopics)
  next.seoBlueprint.audiences = stringArray(seoBlueprint.audiences).length ? stringArray(seoBlueprint.audiences) : stringArray(next.seoBlueprint.audiences)
  next.seoBlueprint.languages = brief.languages.length ? [...brief.languages] : stringArray(next.seoBlueprint.languages).length ? stringArray(next.seoBlueprint.languages) : ['en']
  next.seoBlueprint.localSeo = Boolean(brief.location || next.seoBlueprint.localSeo)
  next.seoBlueprint.servicePages = seoBlueprint.service_pages !== false
  next.seoBlueprint.locationPages = Boolean(seoBlueprint.location_pages)
  next.seoBlueprint.blog = Boolean(seoBlueprint.blog ?? brief.requiredCapabilities.some((item) => /blog/i.test(item)))

  const pageContentById = new Map((content.pages ?? []).filter((page) => page?.id).map((page) => [String(page.id), page]))
  for (const page of sitePages(next)) {
    const pageContent = pageContentById.get(String(page.id))
    if (!pageContent) continue
    page.seo = page.seo ?? {}
    page.seo.title = truncate(nonEmpty(pageContent.seo?.title) || page.seo.title || `${page.name} | ${next.name}`, 70)
    page.seo.description = truncate(nonEmpty(pageContent.seo?.description) || page.seo.description || pageDescription(page, brief), 180)
    page.seo.canonicalPath = page.seo.canonicalPath || page.path || '/'
    page.seo.indexable = page.seo.indexable !== false
    page.seo.structuredDataTypes = Array.isArray(page.seo.structuredDataTypes) ? page.seo.structuredDataTypes : []
    const keyword = nonEmpty(pageContent.seo?.primary_keyword)
    if (keyword) page.seo.primaryKeyword = keyword

    const byId = new Map((pageContent.sections ?? []).filter((item) => item?.id).map((item) => [String(item.id), item]))
    const imageById = new Map((pageContent.image_briefs ?? []).filter((item) => item?.section_id).map((item) => [String(item.section_id), item]))
    for (const section of siteSections(page)) {
      const generated = byId.get(String(section.id))
      if (generated?.props && typeof generated.props === 'object' && !Array.isArray(generated.props)) {
        section.props = normalizeSectionProps(section.props ?? {}, generated.props, section.component?.componentId, brief, next.name)
      }
      const imageBrief = imageById.get(String(section.id))
      if (imageBrief)
        section.props = {
          ...(section.props ?? {}),
          imageBrief: normalizeImageBrief(imageBrief, section.id, brief, page, section),
        }
    }

    const faqs = validFaqs(pageContent.faqs).slice(0, 8)
    if (faqs.length) {
      const faqSection = preferredFaqSection(siteSections(page))
      if (faqSection) {
        faqSection.props = { ...(faqSection.props ?? {}), faqs }
      }
    }
  }
  ensureUniqueHeadings(sitePages(next))
  return next
}

function ensureUniqueHeadings(pages: any[]) {
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
  for (const page of pages) {
    for (const section of siteSections(page)) {
      const component = sectionFamily(section?.component?.componentId)
      if (component === 'navbar' || component === 'footer') continue
      const props = section?.props
      if (!isRecord(props)) continue
      const key = typeof props.heading === 'string' && props.heading.trim() ? 'heading' : typeof props.title === 'string' && props.title.trim() ? 'title' : null
      if (!key) continue
      const original = String(props[key]).trim()
      const normalized = original.toLowerCase()
      const occurrence = counts.get(normalized) ?? 0
      counts.set(normalized, occurrence + 1)
      if (occurrence === 0) continue
      const pageName = nonEmpty(page?.name)
      const candidates = [
        ...(component ? (alternatives[component] ?? []) : []),
        pageName ? `${original} for ${pageName}` : '',
        pageName && component ? `${title(component)} on ${pageName}` : '',
      ].filter(Boolean)
      const replacement = candidates.find((candidate) => !counts.has(candidate.toLowerCase()))
      const unique = truncate(replacement || `${original} — ${occurrence + 1}`, 70)
      props[key] = unique
      counts.set(unique.toLowerCase(), 1)
    }
  }
}

function fallbackFaqs(page: any, brief: Brief): AiFaq[] {
  if (isContactPage(page)) {
    return [
      {
        question: `How do I contact ${brief.businessName}?`,
        answer: `Use the enquiry form to share what you need. ${brief.businessName} can reply with the appropriate next step.`,
      },
      {
        question: 'Is an appointment confirmed when I submit the form?',
        answer: `No. Your submission is a request until ${brief.businessName} confirms availability.`,
      },
    ]
  }
  if (isTeamPage(page)) {
    return [
      {
        question: 'Where can I find information about the team?',
        answer: `This page should list only names, roles, biographies, and credentials supplied or approved by ${brief.businessName}.`,
      },
      {
        question: 'How can I ask which service may be relevant?',
        answer: `Contact ${brief.businessName} for information relevant to your situation. Website content does not replace professional advice.`,
      },
    ]
  }
  if (isAboutPage(page)) {
    return [
      {
        question: `What can I learn about ${brief.businessName}?`,
        answer: 'Review the verified information on this page, then contact the team if you need more detail.',
      },
      {
        question: 'Where can I ask a specific question?',
        answer: `Use the contact path to send your question directly to ${brief.businessName}.`,
      },
    ]
  }

  const services = brief.services.slice(0, 4)
  if (services.length) {
    return services.map((service) => ({
      question: `What should I know about ${service}?`,
      answer: `Contact ${brief.businessName} for verified information about ${service}, suitability, the process, and next steps for your situation.`,
    }))
  }
  return [
    {
      question: `How can I learn more about ${brief.businessName}?`,
      answer: `Review the information on this page and contact ${brief.businessName} for details relevant to your needs.`,
    },
  ]
}

function fallbackImageBrief(page: any, section: any, brief: Brief): AiImageBrief {
  const family = sectionFamily(section?.component?.componentId) || 'website'
  const pageName = nonEmpty(page?.name) || 'website'
  const clinic = /dental|dentist|dentistry|clinic|orthodont|oral care/i.test(`${brief.industry} ${brief.subindustry ?? ''}`)
  const subject = clinic
    ? 'an authentic, unoccupied dental clinic environment or relevant equipment detail; no identifiable clinicians or patients, no simulated treatment, no outcome claims'
    : `an authentic ${brief.industry} environment or relevant detail; do not invent identifiable staff, customers, reviews, products, credentials, or outcomes`
  return {
    section_id: String(section?.id ?? ''),
    purpose: `${pageName} ${family} section visual`,
    prompt: `Professional website photography for ${brief.businessName}; ${pageName} page; ${family} section; ${subject}; clean composition, accurate context, no embedded text, no invented logo.`,
    alt: `${brief.businessName} ${pageName} ${family} visual`,
  }
}

function topicForPage(page: any, brief: Brief) {
  const context = pageContext(page)
  if (/service|treatment|menu|course|propert|feature|stay/.test(context)) return brief.services[0] || brief.subindustry || brief.industry
  if (/doctor|team|people|staff/.test(context)) return `${brief.industry} team`
  if (/contact|appointment|book|reserve|enquir/.test(context)) return contactActionLabel(brief)
  if (/about|story/.test(context)) return brief.businessName
  return brief.services[0] || brief.subindustry || brief.industry
}

function pageDescription(page: any, brief: Brief) {
  const services = brief.services.length ? brief.services.join(', ') : brief.industry
  if (isContactPage(page)) return `Send an enquiry or request to ${brief.businessName}. The team will confirm availability and the appropriate next step.`
  if (isTeamPage(page)) return `View only verified names, roles, biographies, and credentials supplied or approved by ${brief.businessName}.`
  if (isAboutPage(page)) return brief.notes || `Learn about ${brief.businessName} using information supplied or approved by the business.`
  if (/service|treatment|menu|course|propert|feature|stay/.test(pageContext(page)))
    return `Explore ${services}${brief.location ? ` in ${brief.location}` : ''} and contact ${brief.businessName} for information relevant to your needs.`
  return `Explore ${services}${brief.location ? ` in ${brief.location}` : ''} and contact ${brief.businessName} for clear information about the next step.`
}

function heroTitleForPage(page: any, brief: Brief) {
  const context = pageContext(page)
  if (isContactPage(page)) return truncate(`${contactActionLabel(brief)} with ${brief.businessName}`, 70)
  if (isTeamPage(page)) return truncate(`Meet the team at ${brief.businessName}`, 70)
  if (isAboutPage(page)) return truncate(`About ${brief.businessName}`, 70)
  if (/service|treatment|menu|course|propert|feature|stay/.test(context)) return truncate(`Explore ${nonEmpty(page?.name) || title(topicForPage(page, brief))}`, 70)
  return heroTitle(brief)
}

function servicesHeading(page: any, brief: Brief) {
  if (/restaurant|hospitality|dining/i.test(`${brief.industry} ${brief.subindustry ?? ''}`)) return 'Explore the current offering'
  return /service|treatment/.test(pageContext(page)) ? `Explore ${title(brief.industry)} services` : `Services from ${brief.businessName}`
}

function pageContext(page: any) {
  return `${nonEmpty(page?.path)} ${nonEmpty(page?.name)}`.toLowerCase()
}

function isContactPage(page: any) {
  return /contact|appointment|book|reserve|enquir/.test(pageContext(page))
}

function isAboutPage(page: any) {
  return /about|story/.test(pageContext(page))
}

function isTeamPage(page: any) {
  return /doctor|team|people|staff/.test(pageContext(page))
}

function preferredFaqSection(sections: any[]) {
  const preferred = ['faq', 'services', 'about', 'contact', 'features', 'process', 'team', 'cta']
  return (
    preferred.map((family) => sections.find((section) => sectionFamily(section?.component?.componentId) === family)).find(Boolean) ??
    sections.find((section) => !['navbar', 'footer'].includes(sectionFamily(section?.component?.componentId) ?? ''))
  )
}

function normalizeImageBrief(value: AiImageBrief, sectionId: unknown, brief: Brief, page: any, section: any): AiImageBrief {
  const fallback = fallbackImageBrief(page, section, brief)
  const proposed = `${nonEmpty(value?.purpose)} ${nonEmpty(value?.prompt)} ${nonEmpty(value?.alt)}`
  const clinic = /dental|dentist|dentistry|clinic|orthodont|oral care/i.test(`${brief.industry} ${brief.subindustry ?? ''}`)
  const unsafeClinicBrief =
    clinic &&
    /(?:portrait|headshot|smiling\s+(?:doctor|dentist|clinician|patient)|(?:doctor|dentist|clinician|patient).*(?:performing|treating|receiving|posing)|before[- ]and[- ]after|award|certif|five[- ]star|guaranteed|outcome)/i.test(
      proposed,
    )
  const safeValue = unsafeClinicBrief ? fallback : value
  return {
    section_id: String(sectionId ?? ''),
    purpose: truncate(nonEmpty(safeValue?.purpose) || fallback.purpose || 'Website section visual', 160),
    prompt: truncate(nonEmpty(safeValue?.prompt) || fallback.prompt || 'Professional, authentic website photography without embedded text or invented claims.', 800),
    alt: truncate(nonEmpty(safeValue?.alt) || fallback.alt || 'Website section visual', 180),
  }
}

function validFaqs(value: unknown): AiFaq[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const question = nonEmpty(item.question)
    const answer = nonEmpty(item.answer)
    return question && answer ? [{ question: truncate(question, 180), answer: truncate(answer, 600) }] : []
  })
}

function normalizeSectionProps(existing: Record<string, unknown>, generated: Record<string, unknown>, componentId: unknown, brief: Brief, snapshotName: string) {
  const family = sectionFamily(componentId)
  const merged: Record<string, unknown> = { ...existing }
  const contentKeys = new Set(['eyebrow', 'kicker', 'title', 'heading', 'subtitle', 'subheading', 'description', 'body', 'label', 'caption', 'items', 'primaryAction', 'secondaryAction', 'ctaLabel'])

  for (const [key, value] of Object.entries(generated)) {
    if (!contentKeys.has(key) && !(key in existing)) continue
    if (isProtectedPropKey(key)) continue
    if (key === 'primaryAction' || key === 'secondaryAction') {
      const current = isRecord(existing[key]) ? existing[key] : null
      const proposed = isRecord(value) ? value : null
      const label = nonEmpty(proposed?.label)
      if (current && label) merged[key] = { ...current, label }
      continue
    }
    if (key === 'items') {
      merged.items = normalizeItems(existing.items, value, family, brief)
      continue
    }
    if (typeof value === 'string') merged[key] = value.trim()
  }

  const heading = nonEmpty(generated.heading)
  const body = nonEmpty(generated.body)
  if (!nonEmpty(merged.title) && heading) merged.title = heading
  if (!nonEmpty(merged.description) && body) merged.description = body
  const ctaLabel = nonEmpty(generated.ctaLabel)
  if (ctaLabel) {
    const current = isRecord(existing.primaryAction) ? existing.primaryAction : null
    if (current) merged.primaryAction = { ...current, label: ctaLabel }
  }
  if (family === 'hero' && isPlaceholderCopy(merged.title, snapshotName)) merged.title = heroTitle(brief)
  if (family === 'hero' && isGenericCopy(merged.description)) merged.description = heroDescription(brief)
  if (family === 'hero') {
    const secondary = isRecord(existing.secondaryAction) ? existing.secondaryAction : null
    if (secondary)
      merged.secondaryAction = {
        ...secondary,
        label: secondaryActionLabel(brief),
      }
  }
  if (family === 'services' && Array.isArray(merged.items)) {
    merged.items = merged.items.map((item: any) => ({
      ...item,
      description: isGenericCopy(item?.description) ? serviceDescription(String(item?.title ?? ''), brief) : item?.description,
    }))
  }
  if (family === 'contact' && isPlaceholderCopy(merged.title, snapshotName)) merged.title = contactTitle(brief)
  delete merged.heading
  delete merged.body
  delete merged.ctaLabel
  return merged
}

function normalizeItems(existingValue: unknown, generatedValue: unknown, family: string | null, brief: Brief) {
  const existing = Array.isArray(existingValue) ? existingValue : []
  const generated = Array.isArray(generatedValue) ? generatedValue : []
  if (['navbar', 'footer', 'team', 'testimonials', 'gallery', 'contact'].includes(family ?? '')) return existing

  if (family === 'services') {
    if (!brief.services.length) return existing
    const existingByTitle = new Map(existing.filter(isRecord).map((item) => [normalizedText(item.title), item]))
    const generatedByTitle = new Map(generated.filter(isRecord).map((item) => [normalizedText(item.title), item]))
    return brief.services.slice(0, 8).map((service, index) => {
      const key = normalizedText(service)
      const current = existingByTitle.get(key) ?? (isRecord(existing[index]) ? existing[index] : {})
      const proposed = generatedByTitle.get(key) ?? (isRecord(generated[index]) ? generated[index] : {})
      return {
        ...current,
        title: service,
        description: nonEmpty(proposed.description) || nonEmpty(current.description) || serviceDescription(service, brief),
      }
    })
  }

  return generated.slice(0, 8).flatMap((item, index) => {
    if (!isRecord(item)) return []
    const current = isRecord(existing[index]) ? existing[index] : {}
    const next: Record<string, unknown> = { ...current }
    for (const key of ['title', 'description', 'body', 'label', 'caption']) {
      const value = nonEmpty(item[key])
      if (value) next[key] = value
    }
    return Object.keys(next).length ? [next] : []
  })
}

function isProtectedPropKey(key: string) {
  return /^(?:id|component|componentId|version|bindings?|actionId|inputMap|href|url|path|src|assetId|logoAssetId|image|imageBrief|phone|telephone|email|address|location|coordinates|credential|credentials|price|pricing|availability|reviews?|rating|copyright|footerLinks|navigation)$/i.test(
    key,
  )
}

function normalizedText(value: unknown) {
  return nonEmpty(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function sectionFamily(value: unknown): string | null {
  const component = String(value ?? '').trim()
  const legacy = component.toLowerCase().split('.')[0]
  if (['navbar', 'hero', 'about', 'services', 'features', 'process', 'testimonials', 'gallery', 'team', 'faq', 'cta', 'contact', 'footer'].includes(legacy)) return legacy
  const match = component.toUpperCase().match(/-(NAV|HERO|ABOUT|SERV|FEAT|PROC|TEST|GALL|TEAM|FAQ|CTA|CONT|FOOT)-/)
  const families: Record<string, string> = {
    NAV: 'navbar',
    HERO: 'hero',
    ABOUT: 'about',
    SERV: 'services',
    FEAT: 'features',
    PROC: 'process',
    TEST: 'testimonials',
    GALL: 'gallery',
    TEAM: 'team',
    FAQ: 'faq',
    CTA: 'cta',
    CONT: 'contact',
    FOOT: 'footer',
  }
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
  return /restaurant|hospitality|dining/i.test(`${brief.industry} ${brief.subindustry ?? ''}`)
    ? 'Reserve a table'
    : brief.goals.some((goal) => /book|appointment/i.test(goal))
      ? 'Book an appointment'
      : 'Get in touch'
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
  return (
    !text || text === 'build trust' || text.includes('review the information supplied by the business') || (text.includes('explore what ') && text.includes('offers and contact the team for details'))
  )
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
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
function sitePages(value: any): any[] {
  return Array.isArray(value?.pages) ? value.pages : []
}
function siteSections(value: any): any[] {
  return Array.isArray(value?.sections) ? value.sections : []
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
function string(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
function optional(value: unknown) {
  const result = string(value)
  return result || null
}
function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(string).filter(Boolean) : []
}
function nonEmpty(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}
function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}
function title(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'page'
  )
}
