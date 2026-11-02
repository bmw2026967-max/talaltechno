/**
 * Non-destructive tenant provisioning for Talal Techno.
 *
 * Creates a new tenant with one branch, warehouse, owner account, chart of
 * accounts, menu categories, ten tables and a POS device. It never truncates
 * or deletes existing data and refuses to reuse an existing slug.
 *
 * Usage (inside the API/database container or a machine with DATABASE_URL):
 *   pnpm --filter @talaltechno/database provision:tenant \
 *     --name "مطعم النخيل" --slug alnakheel \
 *     --email owner@alnakheel.sa --password "StrongPass123!" \
 *     --branch "الفرع الرئيسي" --city الرياض
 *
 * يمكن تمرير القيم عبر متغيرات البيئة بدلاً من الأعلام (يستخدمه خادم Render):
 *   TENANT_NAME, TENANT_SLUG, OWNER_EMAIL, OWNER_PASSWORD,
 *   TENANT_BRANCH, TENANT_CITY
 *
 * أضف --if-missing لتخطي التهيئة بهدوء إذا كان الرمز موجوداً مسبقاً (idempotent).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const ifMissing = args.includes('--if-missing');
const resetPassword = args.includes('--reset-password');

const name = flag('name', process.env.TENANT_NAME);
const slug = (flag('slug', process.env.TENANT_SLUG) || '').trim().toLowerCase();
const email = (flag('email', process.env.OWNER_EMAIL) || '').trim().toLowerCase();
const password = flag('password', process.env.OWNER_PASSWORD);
const branchName = flag('branch', process.env.TENANT_BRANCH || 'الفرع الرئيسي');
const branchCode = flag('branch-code', 'BR-01');
const city = flag('city', process.env.TENANT_CITY || 'الرياض');
const vatNumber = flag('vat', null);
const crNumber = flag('cr', null);
const phone = flag('phone', null);

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

if (!name) fail('--name مطلوب.');
if (!/^[a-z0-9][a-z0-9-]{2,48}$/.test(slug)) {
  fail('--slug مطلوب ويقبل الأحرف اللاتينية الصغيرة والأرقام والشرطة (3–49 حرفاً).');
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('--email غير صالح.');
if (!password || password.length < 8) fail('--password مطلوب بطول 8 أحرف على الأقل.');

const chart = [
  ['1101', 'الصندوق (النقدية)', 'ASSET'],
  ['1102', 'البنك / مدى', 'ASSET'],
  ['1103', 'العملاء (المدينون)', 'ASSET'],
  ['1104', 'المخزون', 'ASSET'],
  ['1105', 'ضريبة القيمة المضافة - مشتريات', 'ASSET'],
  ['1201', 'الأصول الثابتة', 'ASSET'],
  ['2101', 'الموردون (الدائنون)', 'LIABILITY'],
  ['2102', 'ضريبة القيمة المضافة - مبيعات', 'LIABILITY'],
  ['2103', 'رواتب مستحقة', 'LIABILITY'],
  ['3101', 'رأس المال', 'EQUITY'],
  ['3102', 'الأرباح المحتجزة', 'EQUITY'],
  ['4101', 'إيرادات المبيعات', 'REVENUE'],
  ['4102', 'إيرادات التوصيل (تطبيقات / منصات)', 'REVENUE'],
  ['4103', 'إيرادات أخرى', 'REVENUE'],
  ['4104', 'خصم مسموح به', 'REVENUE'],
  ['5101', 'تكلفة المواد المباعة', 'EXPENSE'],
  ['5102', 'مصروفات التشغيل', 'EXPENSE'],
  ['5103', 'الإيجارات', 'EXPENSE'],
  ['5108', 'رواتب الموظفين', 'EXPENSE'],
  ['5109', 'مصروفات متنوعة', 'EXPENSE']
];

const categories = ['مقبلات', 'سلطات', 'مشاوي', 'وجبات رئيسية', 'حلويات', 'مشروبات'];
const tables = Array.from({ length: 10 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    name: `T${number}`,
    zone: index < 4 ? 'الصالة الرئيسية' : index < 7 ? 'العائلات' : 'الحديقة',
    seats: index < 7 ? 4 : 6
  };
});

async function main() {
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    if (resetPassword && password) {
      const owner = await prisma.user.findFirst({ where: { tenantId: existing.id, role: 'OWNER' } });
      if (owner) {
        const passwordHash = await bcrypt.hash(password, 12);
        await prisma.user.update({ where: { id: owner.id }, data: { passwordHash } });
        console.log(`✔ تم إعادة تعيين كلمة مرور المالك "${owner.email}" للمنشأة "${slug}".`);
        return;
      }
      fail(`لم يُعثر على حساب مالك للمنشأة "${slug}".`);
    }
    if (ifMissing) {
      console.log(`✔ المستأجر "${slug}" موجود مسبقاً — تم تخطي التهيئة.`);
      return;
    }
    fail(`يوجد مستأجر بالرمز "${slug}" مسبقاً. اختر رمزاً آخر أو استخدم لوحة التحكم.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name,
        slug,
        vatNumber,
        crNumber,
        email,
        phone,
        city,
        settings: {
          brand: name,
          invoicePrefix: 'TT',
          receiptFooter: `شكراً لزيارتكم — ${name}`,
          serviceChargeRate: 0,
          loyalty: { earnPerSar: 1, redeemValue: 0.05 },
          emenu: {
            enabled: true,
            allowSelfOrder: true,
            requireTable: false,
            welcomeText: `أهلاً بكم في ${name}. اطلبوا مباشرة من الهاتف.`
          }
        }
      }
    });

    const branch = await tx.branch.create({
      data: {
        tenantId: tenant.id,
        name: branchName,
        code: branchCode,
        city,
        phone
      }
    });

    const warehouse = await tx.warehouse.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'المخزن الرئيسي',
        code: 'WH-01'
      }
    });

    const owner = await tx.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'مالك المنشأة',
        email,
        phone,
        role: 'OWNER',
        passwordHash
      }
    });

    for (const [code, accountName, type] of chart) {
      await tx.account.create({
        data: { tenantId: tenant.id, code, name: accountName, type }
      });
    }

    for (const [index, categoryName] of categories.entries()) {
      await tx.category.create({
        data: { tenantId: tenant.id, name: categoryName, sort: index + 1 }
      });
    }

    for (const table of tables) {
      await tx.diningTable.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: table.name,
          zone: table.zone,
          seats: table.seats,
          qrToken: `${slug}-${table.name.toLowerCase()}-${Math.random().toString(36).slice(2, 10)}`
        }
      });
    }

    await tx.device.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'نقطة بيع 1',
        type: 'POS',
        serial: 'POS-001'
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: owner.id,
        action: 'تهيئة منشأة جديدة',
        entity: 'tenant',
        entityId: tenant.id,
        details: `Slug: ${slug} — Branch: ${branch.code}`
      }
    });

    return { tenant, branch, warehouse, owner };
  });

  console.log('\n✔ تمت تهيئة المنشأة بنجاح');
  console.log(`   المنشأة : ${result.tenant.name} (${result.tenant.slug})`);
  console.log(`   الفرع   : ${result.branch.name} (${result.branch.code})`);
  console.log(`   المخزن  : ${result.warehouse.name}`);
  console.log(`   المالك  : ${result.owner.email}`);
  console.log(`   الدور   : OWNER`);
  console.log('\nالخطوة التالية: سجّل الدخول إلى لوحة التحكم أو تطبيق POS باستخدام:');
  console.log(`   Tenant Slug: ${slug}`);
  console.log(`   Email      : ${email}`);
  console.log('   Password   : (كلمة المرور التي أدخلتها)\n');
}

main()
  .catch((error) => {
    console.error('\n✖ فشلت التهيئة:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
