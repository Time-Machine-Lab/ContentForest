export const GENERATOR_ENABLE_STATES = {
  enabled: "enabled",
  disabled: "disabled",
} as const;

export type GeneratorEnableState =
  (typeof GENERATOR_ENABLE_STATES)[keyof typeof GENERATOR_ENABLE_STATES];

export interface GeneratorSummary {
  id: string;
  name: string;
  description: string;
  enableState: GeneratorEnableState;
  contentLocation: string;
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
}

export interface GeneratorSkillOverview {
  skillMarkdown: string;
  entries: string[];
}

export interface GeneratorDetail extends GeneratorSummary, GeneratorSkillOverview {}

export interface SelectableGenerator {
  id: string;
  name: string;
  description: string;
  contentLocation: string;
}
