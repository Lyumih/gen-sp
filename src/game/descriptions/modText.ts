import { getModTemplate } from '../content/modTemplates'

export function describeModCodex(templateId: string): { label: string; lines: string[] } {
  const tmpl = getModTemplate(templateId)
  if (!tmpl) {
    return {
      label: templateId,
      lines: [`Неизвестный модификатор: ${templateId}`],
    }
  }

  return {
    label: tmpl.label,
    lines: [...tmpl.descriptionLines],
  }
}
