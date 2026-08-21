# Business Process

## Confirmed operating model

The existing workflow moves information across OneDrive, PDFs, Word, Excel, and government forms. GlobalWork OS is intended to consolidate the operational workspace.

## Confirmed case lifecycle

The business-confirmed primary lifecycle is:

`Draft` → `Waiting Documents` → `Documents Complete` → `Processing` → `Waiting Government Approval` → `Completed`

Alternative statuses: `On Hold`, `Cancelled`, and `Rejected`. `Completed` and `Cancelled` are terminal. `Rejected` can be reopened. `On Hold` can return to any active status.

## Daily staff workflow

- Start from Dashboard to see assigned, due-today, and overdue tasks.
- Open a case workspace.
- Review documents and extracted fields.
- Complete or assign follow-up tasks.
- Record meaningful actions in the timeline.

## Rules to define during discovery

- What makes a document required, missing, verified, or superseded.
- Whether task completion automatically changes case status.
- Retention, deletion, and access policy for passport and other personal data.

Documents are accessed exclusively through StorageService.

The storage implementation is abstracted from business modules and may use:

- Local Drive
- SMB/NFS
- SFTP
- MinIO
- Amazon S3

Business logic must never access the filesystem directly.
