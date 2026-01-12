require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const { hashPassword } = require('../utils/password');
const {
  AuthAccount,
  AppUser,
  MagazineBrand,
  MagazineTemplate,
  MagazineEdition,
  MagazineSection,
  SubscriptionPlan,
} = require('../models');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seed = async () => {
  try {
    console.log('🌱 Starting seed...');

    await AuthAccount.deleteMany({});
    await AppUser.deleteMany({});
    await MagazineBrand.deleteMany({});
    await MagazineTemplate.deleteMany({});
    await MagazineEdition.deleteMany({});
    await MagazineSection.deleteMany({});
    await SubscriptionPlan.deleteMany({});

    console.log('🧹 Cleared existing data');

    const adminPassword = await hashPassword('admin123');
    const userPassword = await hashPassword('user123');

    const adminAccount = await AuthAccount.create({
      email: 'admin@christisvictor.org',
      password_hash: adminPassword,
      status: 'active',
      is_email_verified: true,
    });

    const userAccount = await AuthAccount.create({
      email: 'user@example.com',
      password_hash: userPassword,
      status: 'active',
      is_email_verified: true,
    });

    const adminUser = await AppUser.create({
      account_id: adminAccount._id,
      email: 'admin@christisvictor.org',
      display_name: 'Super Admin',
      first_name: 'Super',
      last_name: 'Admin',
      roles: [{ role: 'SUPER_ADMIN', brand_ids: [] }],
      status: 'active',
    });

    const normalUser = await AppUser.create({
      account_id: userAccount._id,
      email: 'user@example.com',
      display_name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe',
      roles: [{ role: 'USER', brand_ids: [] }],
      status: 'active',
    });

    console.log('✅ Created admin and user accounts');

    const brand = await MagazineBrand.create({
      name: 'CHRIST is VICTOR',
      slug: 'christ-is-victor',
      publisher_name: 'Christ is Victor Ministries',
      website_url: 'https://christisvictor.org',
      published_by: 'Rev. Yesupadam',
      supported_languages: ['en', 'te', 'ta', 'hi'],
      access_mode: 'subscribers_only',
      status: 'active',
    });

    console.log('✅ Created brand: Christ is Victor');

    const template = await MagazineTemplate.create({
      brand_id: brand._id,
      name: 'CIV English Monthly Template',
      language: 'en',
      is_active: true,
      slots: [
        {
          key: 'editorial',
          label: 'Editorial',
          order: 1,
          required: true,
          rules: {
            allow_audio: true,
            allow_images: true,
            allow_verses: true,
            allow_lists: false,
            allow_highlights: true,
          },
          defaults: {
            section_type: 'editorial',
            title: 'Editorial',
          },
        },
        {
          key: 'story_1',
          label: 'Story 1',
          order: 2,
          required: true,
          rules: {
            allow_audio: true,
            allow_images: true,
            allow_verses: true,
            allow_lists: false,
            allow_highlights: true,
          },
          defaults: {
            section_type: 'story',
          },
        },
        {
          key: 'message_1',
          label: 'Message 1',
          order: 3,
          required: true,
          rules: {
            allow_audio: true,
            allow_images: true,
            allow_verses: true,
            allow_lists: false,
            allow_highlights: true,
          },
          defaults: {
            section_type: 'message',
          },
        },
        {
          key: 'story_2',
          label: 'Story 2',
          order: 4,
          required: true,
          rules: {
            allow_audio: true,
            allow_images: true,
            allow_verses: true,
            allow_lists: false,
            allow_highlights: true,
          },
          defaults: {
            section_type: 'story',
          },
        },
        {
          key: 'story_3',
          label: 'Story 3',
          order: 5,
          required: true,
          rules: {
            allow_audio: true,
            allow_images: true,
            allow_verses: true,
            allow_lists: false,
            allow_highlights: true,
          },
          defaults: {
            section_type: 'story',
          },
        },
        {
          key: 'testimony',
          label: 'Testimony',
          order: 6,
          required: false,
          rules: {
            allow_audio: true,
            allow_images: true,
            allow_verses: true,
            allow_lists: false,
            allow_highlights: true,
          },
          defaults: {
            section_type: 'testimony',
          },
        },
        {
          key: 'flashes_from_fields',
          label: 'Flashes from the Fields',
          order: 7,
          required: true,
          rules: {
            allow_audio: false,
            allow_images: true,
            allow_verses: false,
            allow_lists: true,
            allow_highlights: false,
          },
          defaults: {
            section_type: 'field_report',
            title: 'Flashes from the Fields',
          },
        },
        {
          key: 'eagles_wings',
          label: "Eagle's Wings",
          order: 8,
          required: true,
          rules: {
            allow_audio: true,
            allow_images: false,
            allow_verses: true,
            allow_lists: false,
            allow_highlights: true,
          },
          defaults: {
            section_type: 'devotional',
            title: "Eagle's Wings",
          },
        },
        {
          key: 'prayer_requests',
          label: 'Prayer Requests',
          order: 9,
          required: false,
          rules: {
            allow_audio: false,
            allow_images: false,
            allow_verses: true,
            allow_lists: true,
            allow_highlights: false,
          },
          defaults: {
            section_type: 'prayer',
            title: 'PLEASE PRAY FOR',
          },
        },
      ],
    });

    console.log('✅ Created template with 9 slots');

    brand.default_template_id = template._id;
    await brand.save();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const edition = await MagazineEdition.create({
      brand_id: brand._id,
      year: currentYear,
      month: currentMonth,
      language: 'en',
      volume: `VOL. 65`,
      edition_no: `NO. ${currentMonth}`,
      cover_title: 'Living by Faith',
      template_id: template._id,
      managed_by: adminUser._id,
      status: 'draft',
      masthead: {
        title_line: 'CHRIST is VICTOR',
        org_line: 'Christ is Victor Ministries',
        website_line: 'www.christisvictor.org',
        published_by_line: 'Rev. Yesupadam',
      },
    });

    console.log(`✅ Created edition for ${currentYear}-${currentMonth}`);

    const sections = template.slots.map((slot) => ({
      edition_id: edition._id,
      brand_id: brand._id,
      slot_key: slot.key,
      slot_label: slot.label,
      slot_order: slot.order,
      content: {
        section_type: slot.defaults.section_type || 'other',
        title: slot.defaults.title || '',
        subtitle: slot.defaults.subtitle || '',
        summary: slot.defaults.summary || '',
        body: slot.defaults.body || '',
        author_print_name: slot.defaults.author_print_name || '',
        source_credit: slot.defaults.source_credit || '',
        bible_verses: [],
        highlights: [],
        lists: [],
        header_image: {},
        images: [],
        audio: {},
        page_number: 0,
      },
      status: 'empty',
      created_by: adminUser._id,
    }));

    await MagazineSection.insertMany(sections);

    console.log(`✅ Created ${sections.length} sections for the edition`);

    const yearlyPlan = await SubscriptionPlan.create({
      brand_id: brand._id,
      name: 'Yearly Subscription',
      period: 'yearly',
      price_inr: 999,
      is_active: true,
    });

    console.log('✅ Created yearly subscription plan (₹999)');

    console.log('\n✨ Seed completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('Admin: admin@christisvictor.org / admin123');
    console.log('User:  user@example.com / user123');
    console.log('\n📚 Created:');
    console.log(`- Brand: ${brand.name} (slug: ${brand.slug})`);
    console.log(`- Template: ${template.name} with ${template.slots.length} slots`);
    console.log(`- Edition: ${currentYear}-${String(currentMonth).padStart(2, '0')} (${edition.status})`);
    console.log(`- Subscription Plan: ${yearlyPlan.name} - ₹${yearlyPlan.price_inr}`);
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
};

const run = async () => {
  await connectDB();
  await seed();
  await mongoose.connection.close();
  console.log('\n👋 Disconnected from MongoDB');
  process.exit(0);
};

run();
