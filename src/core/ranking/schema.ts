export type CandidateScoreBreakdown = {
  businessFit: number;
  artDirectionCoherence: number;
  conversionReadiness: number;
  informationArchitecture: number;
  themeCoherence: number;
  total: number;
};

export type RankedCandidate<T> = {
  rank: number;
  candidate: T;
  score: CandidateScoreBreakdown;
  strengths: string[];
  cautions: string[];
};
