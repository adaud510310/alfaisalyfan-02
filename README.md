# فيصلاوي | Al-Faisaly Fan Membership

واجهة MVP عربية RTL لبرنامج عضوية ومكافآت مشجعي نادي الفيصلي. شغّل تطبيق React من مجلد `react`:

```powershell
cd react
npm install
npm run dev
```

ثم افتح الرابط الذي يعرضه Vite، غالبًا `http://localhost:5173`.

## ما تم تنفيذه

### الصفحة الرئيسية العامة

- صفحة رئيسية تسويقية مستوحاة من تجربة صفحات العضوية الرسمية، مع الحفاظ على هوية الفيصلي.
- Hero رئيسي بعنوان «كن جزءًا من قصة الفيصلي» وأزرار لاكتشاف العضويات ومقارنة الباقات.
- قسم تعريفي بالعضوية، ومزايا أساسية تشمل التذاكر والخصومات والولاء.
- عرض الباقات الثلاث والأسعار والمزايا:
	- فيصلاوي: `115 SAR` مع قسيمة `30 SAR` وخصم `5%`.
	- فيصلاوي بلس: `575 SAR` مع قسيمة `200 SAR` وخصم `10%`.
	- الفيصلاوي الأسطوري: `2,300 SAR` مع قسيمة `500 SAR` ومزايا VIP.
- قسم برنامج الولاء وطريقة الاشتراك في ثلاث خطوات.
- الصفحة الرئيسية تعمل بوضع عام مستقل؛ لا يظهر فيها اسم المشترك أو بياناته أو الشريط الجانبي أو عناصر لوحة العضو.
- إزالة تكرار مسار التنقل بحيث يظهر عنوان «الرئيسية» مرة واحدة فقط.

### لوحة العضو والتفاعلات

- لوحة العضو الداخلية متاحة من خلال قسم «عضويتي» وباقي أقسام المحفظة والمزايا والنشاط.
- إظهار الشريط الجانبي وبيانات المشترك في الصفحات الداخلية فقط.
- صفحة إعدادات فعلية تشمل الملف الشخصي، التنبيهات، الأمان والخصوصية.
- تفعيل تبديلات تنبيهات المباريات وعروض الشركاء والنشرة الشهرية.
- تفعيل زر «الرئيسية» للعودة إلى صفحة العضوية العامة.
- تفعيل تسجيل الخروج مع نافذة تأكيد ورسالة نجاح تجريبية.
- تفعيل أزرار اختيار الباقات وفتح نافذة الترقية والدفع التجريبي.
- تفعيل نسخ رموز القسائم إلى الحافظة مع رسالة تأكيد.

### التصميم والتحقق

- تصميم عربي RTL متجاوب مع الجوال والكمبيوتر.
- استخدام ألوان الهوية المحددة في المعمارية: `#7A1028` و`#4D0819` و`#F7F5F2` و`#FFFFFF`.
- استخدام خطوط عربية مناسبة وأيقونات Lucide.
- التحقق من عدم وجود أخطاء في `index.html` و`app.js` وملفات CSS.
- اختبار العرض على الجوال بدون تمرير أفقي، واختبار الانتقال بين الصفحة العامة ولوحة العضو.

هذه نسخة واجهة أمامية ببيانات تجريبية. الدفع وZid يحتاجان Backend وبيانات اعتماد Merchant حقيقية.

## المعمارية المقترحة للإنتاج

- **Mobile:** Flutter + Riverpod/Bloc، مع دعم العربية وRTL وDeep Links.
- **API:** Node.js + TypeScript + Fastify/NestJS. طبقات `auth`, `memberships`, `wallet`, `loyalty`, `integrations/zid`, `payments`.
- **Database:** PostgreSQL مع Prisma/Drizzle، وRedis للكاش وIdempotency locks.
- **Jobs:** BullMQ/SQS لمعالجة Webhooks، إنشاء القسائم، وإرسال الإشعارات دون تعطيل استجابة الطلب.
- **Deployment:** Docker، خدمة API خلف WAF، PostgreSQL مُدار، وObject Storage للبطاقات والصور.

## نموذج البيانات الأساسي

- `users`: هوية المستخدم، الهاتف، البريد، `zid_customer_id`.
- `membership_tiers`: مفتاح الباقة، السعر، الخصم، قيمة القسيمة.
- `subscriptions`: المستخدم، الباقة، الحالة، البداية، النهاية، بوابة الدفع، مرجع العملية.
- `wallet_vouchers`: الرمز، القيمة، الحالة، تاريخ الانتهاء، `zid_coupon_id`، `idempotency_key`.
- `loyalty_ledger`: حركات النقاط immutable مع `source`, `reference_id`, `points`.
- `zid_webhook_events`: payload hash، نوع الحدث، الحالة، عدد المحاولات، وقت المعالجة.

## تدفقات Zid

1. **تسجيل المستخدم:** إنشاء المستخدم محليًا، ثم `Zid Customers API` لإنشاء/مزامنة العميل، وحفظ `zid_customer_id`. لا يخزّن التطبيق كلمة مرور Zid؛ يستخدم OAuth/رابط دخول موحد معتمد من Zid.
2. **تفعيل الاشتراك:** بعد تأكيد PayTabs/Moyasar، ينشئ backend قسيمة single-use بقيمة الباقة عبر `Zid Coupons API`، ثم يضيف العميل إلى `Zid Customer Group` المطابق للباقة.
3. **الترقية/التجديد/الإلغاء:** Transaction واحدة محلية تحدّث الاشتراك، المجموعة، والقسيمة. عند الانتهاء تزال المجموعة أو ينقل العميل إلى المجموعة المناسبة.
4. **الولاء:** استقبال `order.create` و`order.completed`، التحقق من توقيع webhook، منع التكرار عبر `event_id`/hash، ثم ربط الطلب بالعميل وإضافة النقاط فقط عند `order.completed`.
5. **الفشل وإعادة المحاولة:** تخزين كل حدث خامًا، ACK سريع، معالجة غير متزامنة، exponential backoff، وdead-letter queue للمراجعة اليدوية.

## واجهات API المقترحة

- `POST /v1/auth/register`
- `GET /v1/membership/tiers`
- `POST /v1/subscriptions`
- `POST /v1/subscriptions/:id/upgrade`
- `GET /v1/wallet/vouchers`
- `GET /v1/loyalty/summary`
- `POST /v1/webhooks/zid`
- `POST /v1/webhooks/payments/:provider`

## الدفع والأمان

استخدم PayTabs أو Moyasar كبوابة أساسية مع Apple Pay وMada، وTamara/Tabby كخيار BNPL بعد موافقة الأعمال. لا تمرر بيانات البطاقة عبر backend؛ استخدم hosted checkout/tokenization. طبّق تحقق توقيع webhooks، تشفير الأسرار، rate limiting، audit logs، وقيود صلاحيات الإدارة.

## خطة التنفيذ

1. **Discovery وZid validation:** تأكيد صلاحيات Merchant API، OAuth، customer groups، coupons، webhook signature، وحدود المعدل في بيئة sandbox.
2. **Foundation:** إعداد Flutter، API TypeScript، PostgreSQL migrations، auth، observability، وCI/CD.
3. **Membership + payments:** الباقات، الاشتراكات، التجديد، الدفع، وإصدار القسائم idempotently.
4. **Zid integration:** customer sync، groups، coupons، webhook worker، reconciliation dashboard.
5. **Loyalty + engagement:** ledger، قواعد النقاط، rewards، push/email، merchants، وتذاكر المباريات.
6. **Launch readiness:** اختبارات contract/webhook، security review، load test، pilot لأعضاء محدودين، ثم rollout تدريجي.

## قرارات يجب حسمها قبل الإنتاج

- قواعد احتساب النقاط: قيمة الطلب، المنتجات المستثناة، الإرجاع، والحدود الشهرية.
- هل الخصم يتراكم مع عروض المتجر؟ وهل يشمل الشحن؟
- سياسة القسائم عند الإلغاء أو chargeback.
- مزود SSO المعتمد من Zid وتجربة ربط الحساب الحالية.
- مصدر صلاحية التذاكر ومقاعد VIP، وعمليات التحقق عند بوابة الملعب.
