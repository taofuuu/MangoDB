-- T4.1.5, ADR 0017. The navbar bell's notices. Each action saves one row for
-- the other party, in its own transaction, so this table must exist before
-- the API that writes it is deployed.

-- CreateTable
CREATE TABLE "notification" (
    "notification_id" SERIAL NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "proposal_id" INTEGER NOT NULL,
    "notification_type" VARCHAR(50) NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
-- The bell asks for one company's newest notices.
CREATE INDEX "notification_recipient_id_created_at_idx" ON "notification"("recipient_id", "created_at");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "company"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "company"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposal"("proposal_id") ON DELETE CASCADE ON UPDATE NO ACTION;
