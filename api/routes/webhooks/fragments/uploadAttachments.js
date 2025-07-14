import { prisma } from "#prisma";
import { uploadFile } from "#file";

export const uploadAttachments = async (inboundEmailId, attachments, reqId) => {
  if (!attachments?.length) return;
  for (const attachment of attachments) {
    try {
      const { Name, Content, ContentType, ContentLength } = attachment;
      const inboundEmailAttachment = await prisma.inboundEmailAttachment.create(
        {
          data: { inboundEmailId },
        }
      );
      const uploadedFile = await uploadFile({
        name: Name,
        file: Content,
        contentType: ContentType,
        contentLength: ContentLength,
        inboundEmailAttachmentId: inboundEmailAttachment.id,
      });
      await prisma.inboundEmailAttachment.update({
        where: { id: inboundEmailAttachment.id },
        data: { fileId: uploadedFile.id },
      });
    } catch (err) {
      console.error(`[${reqId}] error uploading attachment:`, err);
    }
  }
};
