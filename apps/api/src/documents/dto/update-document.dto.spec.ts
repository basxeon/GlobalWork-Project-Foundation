import { validate } from 'class-validator';
import { UpdateDocumentDto } from './update-document.dto';

describe('UpdateDocumentDto', () => {
  it.each([
    'PASSPORT',
    'VISA',
    'WORK_PERMIT',
    'PHOTO',
    'CONTRACT',
    'COMPANY_DOCUMENT',
    'TM30',
    'OTHER',
  ])('accepts the %s category', async (category) => {
    const dto = new UpdateDocumentDto();
    dto.category = category;

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an unknown category', async () => {
    const dto = new UpdateDocumentDto();
    dto.category = 'UNAPPROVED';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('category');
  });
});
