# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start:dev

# Build
npm run build

# Run (production)
npm run start:prod

# Lint (auto-fix)
npm run lint

# Format
npm run format

# Tests
npm run test                  # all unit tests
npm run test:watch            # watch mode
npm run test:cov              # with coverage
npm run test:e2e              # end-to-end tests

# Run a single test file
npx jest src/api/auth/auth.service.spec.ts

# Database migrations
npm run migration:generate    # auto-generate from entity changes
npm run migration:create      # create a blank migration
npm run migration:run         # apply pending migrations
npm run migration:revert      # revert last migration
```

## Environment Variables

```env
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=authdb
JWT_SECRET=
JWT_EXPIRES_IN=
```

`app.module.ts` ตั้ง **`synchronize: true`** — ตารางถูกสร้าง/แก้อัตโนมัติจาก entity
ใช้ได้เฉพาะ local เท่านั้น production ต้องปิดแล้วใช้ migration

> `package.json` มี script `migration:generate` / `migration:run` / `seed:run` อยู่
> แต่ `src/migrations/` **ยังว่าง 0 ไฟล์** — ยังไม่เคยใช้จริง

---

## Architecture

NestJS REST API สำหรับ authentication + authorization บน PostgreSQL ผ่าน TypeORM

**ไม่มี Kafka** — service นี้ไม่ publish และไม่ consume event ใด ๆ (ต่างจาก
MedicineService / StockService / PrescriptionServices ในกลุ่มเดียวกันที่คุยกันผ่าน Kafka)

### Module structure

| module | โฟลเดอร์ | ดูแลอะไร |
|---|---|---|
| **AuthModule** | `src/auth/` | login, ออก JWT |
| **UsersModule** | `src/users/` | entity `User`, สร้าง/ค้นหา/แสดงรายการผู้ใช้ |
| **AdminModule** | `src/admin/` | จัดการผู้ใช้ฝั่ง admin |
| **RolesModule** | `src/roles/` | บทบาท |
| **PermissionsModule** | `src/permissions/` | สิทธิ์ |

### Layer pattern (ทุก module ใช้เหมือนกัน)

โครงแบบ DDD 4 ชั้น — **ไม่ใช่ `src/api/<module>/` แบบแบนอีกแล้ว**

```
<module>/
├── domain/          entity + ports/ (interface ของ repository)
├── application/     service — logic อยู่ชั้นนี้ (มี .spec.ts คู่กัน)
├── infrastructure/  TypeORM repository implementation
└── presentation/    controller + dto/
```

ตัวอย่างจริงของ `auth`:

```
src/auth/auth.module.ts
src/auth/domain/ports/auth.repository.interface.ts
src/auth/application/auth.service.ts
src/auth/infrastructure/auth.repository.ts
src/auth/presentation/auth.controller.ts
src/auth/presentation/dto/{auth-email-login,register,login-response}.dto.ts
```

**ห้ามข้ามชั้น** — controller เรียก application, application เรียก interface ใน
`domain/ports/` ไม่ใช่ TypeORM ตรง ๆ

### `src/common/` — ใช้ร่วมกันทั้ง 4 service ของ pharmacy-storage

| ไฟล์ | ทำอะไร |
|---|---|
| `entities/base.entity.ts` | base ของทุก entity |
| `guards/jwt-auth.guard.ts` | JWT guard (ไม่ใช่ middleware — เอกสารเดิมเขียนผิด) |
| `decorators/public.decorator.ts` | ยกเว้น endpoint ไม่ต้องใช้ JWT |
| `decorators/current-user.decorator.ts` | ดึง user จาก token |
| `services/hash.service.ts` | bcrypt |
| `utils/pagination.util.ts` · `utils/filter.util.ts` | ตัวช่วย query |

### API endpoints

| prefix | module |
|---|---|
| `/auth` | AuthModule |
| `/users` | UsersModule |
| `/admin/users` | AdminModule |
| `/roles` | RolesModule |
| `/permissions` | PermissionsModule |

### Swagger

`/api-docs` — `setTitle('Auth Service API')` ตรงกับ service (ต่างจากอีก 3 repo ในกลุ่ม
ที่ตั้งเป็น "Prescription Service API" ผิดหมด)

### ยังต้องให้ทีมเติม

เอกสารส่วนนี้เขียนจากสิ่งที่ตรวจสอบได้จากโค้ดเท่านั้น ยังขาด business rule,
เหตุผลเชิงออกแบบ และกับดักที่เจอตอนใช้งานจริง

---

## Rules

- Use Clean Architecture
- No business logic inside controllers
- DTOs must use class-validator decorators

## Code Style

### TypeScript Rules

- Strict mode enabled.
- No `any`.
- Explicit return types required.
- Avoid type assertion unless necessary.

### Naming Conventions

- Classes: PascalCase
- Variables: camelCase
- DTO: End with `Dto`
- Repository files: `<module>.repository.ts`

### NestJS Conventions

- Use @Injectable() for services and repositories.
- Use constructor injection.
- Use DTO + class-validator for input validation.
- Do not use raw request object in services.

### TypeORM Rules

- Use QueryBuilder for dynamic filtering.
- Do not use raw SQL unless necessary.
- Avoid N+1 queries.
- Use transactions for multi-step database operations.

### Folder Rules

- One module per folder.
- No cross-module imports except through exported services.
- Shared utilities must be in src/common.

## Testing
### Unit Testing Rules

- Use Jest.
- Test service logic only.
- Mock repositories.
- Do not mock business logic.

### Test Structure

- File naming: *.spec.ts
- Use describe per class.
- Use beforeEach to reset mocks.

### Coverage Requirements

- Minimum 80% coverage for services.
- Test success case.
- Test failure case.
- Test validation errors.

### E2E Testing

- Use Supertest.
- Test auth flow:
  - Login success
  - Login failure
  - Unauthorized access

## Security
### JWT Rules

- Never expose JWT secret.
- Use environment variables for secrets.
- Access tokens must not contain sensitive data.

### Password Handling

- Always hash passwords using bcrypt.
- Never return password hash in API response.
- Validate password strength.

### Validation Rules

- All input must use class-validator.
- Do not trust request body directly.
- Validate email format.
- Validate required fields.

### Database Security

- Use parameterized queries.
- Never concatenate raw SQL strings.
- Do not expose internal IDs unnecessarily.

### Error Handling

- Do not leak internal error messages.
- Use standardized HTTP exceptions.

## Answer
### Langauge
- only English 

## Comments & Documentation Rules
### General Principles
- Write comments only where necessary.
- Do not comment obvious code.
- Comments must explain why, not what.
- Avoid redundant or trivial comments.
- Keep comments concise and professional.
- All comments must be written in English.
