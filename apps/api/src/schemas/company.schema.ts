import { z } from 'zod';
import { httpUrl } from './common.schema';
import { BCRYPT_MAX_BYTES, fitsBcryptLimit } from '../auth/password';

// One definition per editable column, shared by registration (US1-1) and the
// profile edit (US1-5) so a fix to a rule is one edit rather than two. Sizes
// match the columns in prisma/schema.prisma; anything longer would be a
// database error rather than a validation message.
export const companyFields = {
    company_name: z.string().trim().min(1).max(255),
    // Lowercased because the unique index is case-sensitive: without this,
    // "CodeCrafters" would sit alongside "codecrafters".
    username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(50)
        .regex(/^[a-z0-9_]+$/, 'Use letters, numbers, and underscores only'),
    email: z.email().max(100).toLowerCase(),
    // A password being *set* — registration, and a credential change. A byte
    // cap rather than .max(72): see BCRYPT_MAX_BYTES. This is the one that
    // matters, because it decides what actually gets hashed.
    password: z
        .string()
        .min(8)
        .refine(
            fitsBcryptLimit,
            `Password must be at most ${BCRYPT_MAX_BYTES} bytes`,
        ),
    // A password being *checked*, deliberately not the rule above. Anyone who
    // registered before fitsBcryptLimit existed may hold a longer one, and
    // bcrypt still verifies it against the 72 bytes it hashed back then.
    // Judging it here would lock them out, and would answer a credential
    // question with a 400 that hands out the policy instead of a 401.
    passwordAttempt: z.string().min(1).max(72),
    phone: z
        .string()
        .trim()
        .min(6)
        .max(20)
        .regex(/^[0-9+\-\s()]+$/, 'Use digits and + - ( ) only'),
    // Industry tags — SME, Software House, FinTech. Every seeded company has at
    // least one, so a company can never be left without any.
    company_type: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
    company_description: z.string().trim().max(2000),
    address: z.string().trim().max(500),
    website: httpUrl,
    // Provider-only, and TEXT columns rather than VarChar, so the cap is a
    // policy choice rather than the database's — same one company_description
    // uses.
    service_term: z.string().trim().max(2000),
    warranty_policy: z.string().trim().max(2000),
} as const;

// The columns a unique index can reject. prismaErrors uses this to decide which
// constraint names are worth reporting back to the caller.
export const COMPANY_UNIQUE_FIELDS = ['username', 'email'] as const;

// US1-5. Every field is optional: an absent one leaves the column alone, and
// null clears one that is nullable. The three fields a company signs in with —
// username, email, password — are not here: changing any of them needs the
// current password, so they belong to changeCredentialsSchema below. Keeping
// them here too would leave that gate one request away from being walked
// around. account_type is absent as well, since it would have to add or remove
// the provider/receiver rows and restamp the token's role claim.
//
// strictObject, not object: a plain zod object drops keys it does not know, so
// { company_name, email } would answer 200 having written only half of what was
// asked for. Rejecting names the key instead. (z.strictObject rather than
// .strict(), which zod 4 deprecates.)
export const updateCompanyProfileSchema = z
    .strictObject({
        company_name: companyFields.company_name,
        phone: companyFields.phone,
        company_type: companyFields.company_type,
        company_description: companyFields.company_description.nullable(),
        address: companyFields.address.nullable(),
        website: companyFields.website.nullable(),
        // The address the profile shows so others can get in touch. Same rule
        // as email, a different column: email signs a company in and is
        // unique, this one is neither, so two companies may share it.
        contact_email: companyFields.email.nullable(),
        // These two land on the provider table, not company, so the controller
        // writes them separately and refuses them from a RECEIVER company.
        service_term: companyFields.service_term.nullable(),
        warranty_policy: companyFields.warranty_policy.nullable(),
    })
    .partial()
    // An empty body is a client bug, not a no-op worth a 200.
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export type UpdateCompanyProfileInput = z.infer<
    typeof updateCompanyProfileSchema
>;

// The three fields a company signs in with. All of them sit behind the current
// password, because each one is a way to take the account over: move the email
// and you own the login, change the password and the owner is locked out. A
// token alone is not enough for that.
export const changeCredentialsSchema = z
    .object({
        current_password: companyFields.passwordAttempt,
        username: companyFields.username,
        email: companyFields.email,
        new_password: companyFields.password,
    })
    .partial({ username: true, email: true, new_password: true })
    // current_password on its own changes nothing, so it is a client bug rather
    // than a no-op worth a 200 — the same call updateCompanyProfileSchema makes.
    .refine(
        (body) =>
            body.username !== undefined ||
            body.email !== undefined ||
            body.new_password !== undefined,
        { message: 'Provide a username, an email, or a new password' },
    );

export type ChangeCredentialsInput = z.infer<typeof changeCredentialsSchema>;
