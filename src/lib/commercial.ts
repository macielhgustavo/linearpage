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
