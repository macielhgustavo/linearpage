import { z } from 'zod';

export const stages = ['novo', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'] as const;
export const stageLabels: Record<Stage, string> = {
  novo: 'Novo lead', qualificado: 'Qualificado', proposta: 'Proposta',
  negociacao: 'Negociação', ganho: 'Ganho', perdido: 'Perdido',
};
export type Stage = typeof stages[number];
const optionalText = (max: number) => z.string().trim().max(max).default('');
export const leadSchema = z.object({
  company: z.string().trim().min(1).max(160),
  contact: optionalText(160),
  email: z.union([z.literal(''), z.email().max(254)]).default(''),
  phone: optionalText(40),
  stage: z.enum(stages),
  valueCents: z.number().int().min(0).max(100_000_000_000),
  source: optionalText(100),
  nextAction: optionalText(300),
  nextContact: z.union([z.literal(''), z.iso.date()]).default(''),
  notes: optionalText(5000),
}).strict();
export type LeadInput = z.infer<typeof leadSchema>;
export type Lead = LeadInput & { id: string; createdAt: string; updatedAt: string };
export const activitySchema = z.object({ text: z.string().trim().min(1).max(2000) }).strict();
export type Activity = { id: string; leadId: string; text: string; createdAt: string };

export const smokeInterestSchema = z.object({
  company: z.string().trim().min(1).max(160),
  contact: z.string().trim().min(1).max(160),
  role: optionalText(120),
  email: z.union([z.literal(''), z.email().max(254)]).default(''),
  phone: z.string().trim().min(6).max(40),
  energyBill: z.enum(['', 'ate_10k', '10_30k', '30_100k', '100k_plus']).default(''),
  interest: z.enum(['reduzir_custos', 'identificar_desperdicios', 'monitorar_maquinas', 'entender_consumo', 'outro']),
  website: optionalText(120),
  source: optionalText(100),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(160),
}).strict();

export const smokeEventSchema = z.object({
  sessionId: z.string().trim().min(8).max(80),
  name: z.enum(['landing_view','scroll_50','demo_view','how_it_works_view','cta_click','form_start','form_submit','form_error']),
  path: z.string().trim().max(300).default('/'),
  source: optionalText(100),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(160),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
}).strict();

export const isOpen = (lead: Lead) => lead.stage !== 'ganho' && lead.stage !== 'perdido';
export const todayBR = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export function summarize(leads: Lead[], today: string) {
  const open = leads.filter(isOpen);
  return {
    open: open.length,
    pipeline: open.reduce((sum, lead) => sum + lead.valueCents, 0),
    overdue: open.filter(lead => lead.nextContact && lead.nextContact < today).length,
    dueToday: open.filter(lead => lead.nextContact === today).length,
    won: leads.filter(lead => lead.stage === 'ganho').reduce((sum, lead) => sum + lead.valueCents, 0),
  };
}
