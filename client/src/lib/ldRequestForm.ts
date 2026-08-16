export type LdRequestAttachmentPayload = { fileName: string; mimeType: string; size: number; base64: string };

export function buildLdRequestPayload(input: {
  officeName: string;
  finalClientName: string;
  constructorName: string;
  contactName: string;
  contactPhone: string;
  workState: string;
  workCity: string;
  generalObservation: string;
  desiredQuoteDate: string;
  estimatedDeliveryDate: string;
  attachments: LdRequestAttachmentPayload[];
}) {
  return {
    officeName: input.officeName.trim(),
    finalClientName: input.finalClientName.trim(),
    constructorName: input.constructorName.trim() || undefined,
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    workState: input.workState.trim().toUpperCase(),
    workCity: input.workCity.trim(),
    generalObservation: input.generalObservation.trim() || undefined,
    desiredQuoteDate: input.desiredQuoteDate || undefined,
    estimatedDeliveryDate: input.estimatedDeliveryDate || undefined,
    attachments: input.attachments,
  };
}
