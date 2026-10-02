import { createIcons, LayoutDashboard, Users, CalendarDays, ArrowUpRight, LogOut, ShieldCheck, Plus, ArrowRight, Download, RefreshCw, Search, NotebookPen, X, Trash2, Check } from 'lucide';
import { stages, stageLabels, summarize, todayBR, money, isOpen, type Lead, type Activity, type Stage } from '../lib/commercial';

const icons = { LayoutDashboard, Users, CalendarDays, ArrowUpRight, LogOut, ShieldCheck, Plus, ArrowRight, Download, RefreshCw, Search, NotebookPen, X, Trash2, Check };
const paintIcons = () => createIcons({ icons });
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const text = (id: string, value: string | number) => { $(id).textContent = String(value); };
let leads: Lead[] = [];
let selected: string | null = null;
let view = 'overview';
let loaded = false;
let busy = false;
const dialog = $<HTMLDialogElement>('lead-dialog');
const form = $<HTMLFormElement>('lead-form');
const dateLabel = (date: string) => date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(`${date}T12:00:00`)) : 'Sem data';
function element<K extends keyof HTMLElementTagNameMap>(tag: K, content = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = content;
  node.className = className;
  return node;
}
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) {
    let message = response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : 'Não foi possível concluir. Tente novamente.';
    try { message = (await response.json()).error || message; } catch { /* An Access redirect may return HTML instead of JSON. */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir.';
function filters() {
  const search = $<HTMLInputElement>('search').value.trim().toLocaleLowerCase('pt-BR');
  const stage = $<HTMLSelectElement>('stage-filter').value;
  const due = $<HTMLSelectElement>('due-filter').value;
  const today = todayBR();
  return leads.filter(lead => {
    if (search && !`${lead.company} ${lead.contact} ${lead.email}`.toLocaleLowerCase('pt-BR').includes(search)) return false;
    if (stage && lead.stage !== stage) return false;
    if (view === 'agenda' && !isOpen(lead)) return false;
    if (due && !isOpen(lead)) return false;
    if (due === 'overdue') return !!lead.nextContact && lead.nextContact < today;
    if (due === 'today') return lead.nextContact === today;
    if (due === 'upcoming') return lead.nextContact > today;
    if (due === 'unscheduled') return !lead.nextContact;
    return true;
  }).sort((a, b) => view === 'agenda' ? (a.nextContact || '9999').localeCompare(b.nextContact || '9999') : b.updatedAt.localeCompare(a.updatedAt));
}
function render() {
  const today = todayBR();
  const totals = summarize(leads, today);
  text('metric-open', totals.open);
  text('metric-pipeline', money(totals.pipeline));
  text('metric-overdue', totals.overdue);
  text('metric-won', money(totals.won));
  text('pipeline-count', `${totals.open} abertas`);
  const bars = $('pipeline-bars');
  bars.replaceChildren();
  for (const stage of stages.slice(0, 4)) {
    const count = leads.filter(lead => lead.stage === stage).length;
    const row = element('div', '', 'pipeline-row');
    const track = element('div', '', 'pipeline-track');
    const fill = element('div', '', 'pipeline-fill');
    fill.style.width = `${totals.open ? count / totals.open * 100 : 0}%`;
    track.append(fill);
    row.append(element('span', stageLabels[stage]), track, element('span', String(count)));
    bars.append(row);
  }
  const priority = $('priority-list');
  priority.replaceChildren();
  const pending = leads.filter(lead => isOpen(lead) && lead.nextContact).sort((a, b) => a.nextContact.localeCompare(b.nextContact)).slice(0, 3);
  if (!pending.length) priority.append(element('p', 'Nenhum contato agendado.', 'quiet'));
  for (const lead of pending) {
    const button = element('button', '', 'priority-row');
    const content = element('span');
    content.append(element('strong', lead.company), element('small', lead.nextAction || lead.contact || 'Contato comercial'));
    button.append(content, element('span', lead.nextContact === today ? 'Hoje' : dateLabel(lead.nextContact), `due ${lead.nextContact < today ? 'late' : ''}`));
    button.addEventListener('click', () => openLead(lead));
    priority.append(button);
  }
  const rows = $('lead-rows');
  rows.replaceChildren();
  const filtered = filters();
  text('result-count', `${filtered.length} registros`);
  $('empty').hidden = filtered.length > 0 || !loaded;
  text('empty-title', leads.length ? 'Nenhuma oportunidade encontrada' : 'Nenhuma oportunidade cadastrada');
  text('empty-description', leads.length ? 'Nenhum registro corresponde aos filtros selecionados.' : 'Seu acompanhamento comercial começa aqui.');
  $('empty-create').hidden = leads.length > 0;
  for (const lead of filtered) {
    const row = element('tr');
    const company = element('td');
    const companyButton = element('button', lead.company, 'company-link');
    companyButton.addEventListener('click', () => openLead(lead));
    company.append(companyButton, element('small', lead.contact || lead.email || 'Contato não informado'));
    const stage = element('td');
    stage.append(element('span', stageLabels[lead.stage], `stage ${lead.stage}`));
    const date = element('td', dateLabel(lead.nextContact), isOpen(lead) && lead.nextContact && lead.nextContact < today ? 'due late' : 'due');
    const action = element('td');
    const open = element('button', '', 'icon-button');
    open.title = `Abrir ${lead.company}`;
    open.setAttribute('aria-label', open.title);
    const icon = element('i'); icon.dataset.lucide = 'arrow-up-right'; open.append(icon);
    open.addEventListener('click', () => openLead(lead)); action.append(open);
    row.append(company, stage, element('td', money(lead.valueCents)), date, element('td', lead.nextAction || '—'), action);
    rows.append(row);
  }
  paintIcons();
}
async function refresh() {
  $<HTMLButtonElement>('refresh').disabled = true;
  try {
    leads = await request<Lead[]>('/api/leads');
    loaded = true;
    render();
    text('status', '');
    text('sync-status', `Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
    $<HTMLButtonElement>('new-lead').disabled = false;
    $<HTMLButtonElement>('export').disabled = false;
  } catch (error) { text('status', message(error)); }
  finally { $<HTMLButtonElement>('refresh').disabled = false; }
}
function setView(next: string) {
  view = ['overview', 'leads', 'agenda'].includes(next) ? next : 'overview';
  const title = { overview: 'Visão geral', leads: 'Oportunidades', agenda: 'Próximos contatos' }[view]!;
  text('page-title', title); text('breadcrumb', title);
  text('list-title', view === 'agenda' ? 'Agenda comercial' : 'Todas as oportunidades');
  document.title = `${title} | Linear Admin`;
  $('overview').hidden = view !== 'overview';
  document.querySelectorAll('.sidebar [data-view]').forEach(button => {
    if ((button as HTMLElement).dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $<HTMLSelectElement>('due-filter').value = '';
  $<HTMLSelectElement>('stage-filter').value = '';
  render();
}
function openLead(lead?: Lead) {
  selected = lead?.id ?? null;
  form.reset();
  text('form-error', ''); text('activity-error', '');
  $<HTMLTextAreaElement>('activity-text').value = '';
  text('dialog-title', lead ? 'Editar oportunidade' : 'Nova oportunidade');
  $('delete-lead').hidden = !lead;
  $('history').hidden = !lead;
  if (lead) for (const [key, value] of Object.entries(lead)) {
    const input = form.elements.namedItem(key) as HTMLInputElement | null;
    if (input) input.value = String(value);
  }
  (form.elements.namedItem('value') as HTMLInputElement).value = String((lead?.valueCents ?? 0) / 100);
  dialog.showModal();
  if (lead) void loadActivities(lead.id);
}
async function loadActivities(id: string) {
  $('activities').replaceChildren(element('p', 'Carregando histórico...', 'quiet'));
  try {
    const entries = await request<Activity[]>(`/api/leads/${id}/activities`);
    if (id !== selected) return;
    $('activities').replaceChildren();
    if (!entries.length) $('activities').append(element('p', 'Nenhum contato registrado.', 'quiet'));
    for (const entry of entries) {
      const item = element('article', '', 'activity');
      const time = element('time', new Date(entry.createdAt).toLocaleString('pt-BR'));
      time.dateTime = entry.createdAt;
      item.append(time, element('p', entry.text));
      $('activities').append(item);
    }
  } catch (error) { if (id === selected) text('activities', message(error)); }
}
function lock(value: boolean) {
  busy = value;
  dialog.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = value; });
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  lock(true); text('form-error', '');
  const data = new FormData(form);
  const field = (name: string) => String(data.get(name) ?? '');
  try {
    const lead = await request<Lead>(selected ? `/api/leads/${selected}` : '/api/leads', selected ? 'PUT' : 'POST', {
      company: field('company'), contact: field('contact'), email: field('email').trim(), phone: field('phone'),
      source: field('source'), stage: field('stage') as Stage, valueCents: Math.round(Number(field('value')) * 100),
      nextContact: field('nextContact'), nextAction: field('nextAction'), notes: field('notes'),
    });
    leads = [lead, ...leads.filter(item => item.id !== lead.id)];
    render(); dialog.close(); text('status', 'Oportunidade salva.');
  } catch (error) { text('form-error', message(error)); }
  finally { lock(false); }
});
$('activity-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!selected || busy) return;
  lock(true); text('activity-error', '');
  const id = selected;
  try {
    await request(`/api/leads/${id}/activities`, 'POST', { text: $<HTMLTextAreaElement>('activity-text').value });
    $<HTMLTextAreaElement>('activity-text').value = '';
    await loadActivities(id);
  } catch (error) { text('activity-error', message(error)); }
  finally { lock(false); }
});
$('delete-lead').addEventListener('click', () => { text('delete-error', ''); $<HTMLDialogElement>('delete-dialog').showModal(); });
$('cancel-delete').addEventListener('click', () => $<HTMLDialogElement>('delete-dialog').close());
$('confirm-delete').addEventListener('click', async () => {
  if (!selected || busy) return;
  lock(true);
  $<HTMLButtonElement>('confirm-delete').disabled = true;
  try {
    await request(`/api/leads/${selected}`, 'DELETE');
    leads = leads.filter(lead => lead.id !== selected);
    render(); $<HTMLDialogElement>('delete-dialog').close(); dialog.close(); text('status', 'Oportunidade excluída.');
  } catch (error) { text('delete-error', message(error)); }
  finally { lock(false); $<HTMLButtonElement>('confirm-delete').disabled = false; }
});
dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('close-dialog').addEventListener('click', () => { if (!busy) dialog.close(); });
for (const id of ['new-lead', 'empty-create']) $(id).addEventListener('click', () => openLead());
$('refresh').addEventListener('click', refresh);
for (const id of ['search', 'stage-filter', 'due-filter']) $(id).addEventListener('input', render);
document.querySelectorAll<HTMLElement>('[data-view]').forEach(button => button.addEventListener('click', () => { location.hash = button.dataset.view!; }));
window.addEventListener('hashchange', () => setView(location.hash.slice(1)));
$('export').addEventListener('click', () => {
  const safeCell = (value: string) => `"${(/^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  const rows = [['Empresa', 'Contato', 'E-mail', 'Telefone', 'Etapa', 'Valor estimado (BRL)', 'Origem', 'Próximo contato', 'Próxima ação', 'Observações'], ...filters().map(lead => [lead.company, lead.contact, lead.email, lead.phone, stageLabels[lead.stage], (lead.valueCents / 100).toFixed(2).replace('.', ','), lead.source, lead.nextContact, lead.nextAction, lead.notes])];
  const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map(row => row.map(safeCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `linear-oportunidades-${todayBR()}.csv`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
text('today', new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'America/Sao_Paulo' }).format(new Date()));
paintIcons();
void (async () => {
  try {
    const session = await request<{ email: string; local: boolean }>('/api/session');
    text('identity', session.email);
    $('local-notice').hidden = !session.local;
    setView(location.hash.slice(1));
    await refresh();
  } catch (error) { text('status', message(error)); text('identity', 'Acesso indisponível'); }
})();
