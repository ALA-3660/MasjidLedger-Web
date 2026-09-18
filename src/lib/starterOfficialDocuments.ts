import { OfficialDocument } from '../types/officialDocumentTypes';

export function getStarterOfficialDocuments(mosqueId: string, mosqueName: string = 'বায়তুল আমান জামে মসজিদ'): OfficialDocument[] {
  const now = new Date();
  const year = now.getFullYear();
  const todayStr = now.toISOString().split('T')[0];

  return [
    // 1. নোটিশ (Notice)
    {
      id: 'doc-notice-001',
      mosqueId,
      docType: 'NOTICE',
      subType: 'MEETING_NOTICE',
      documentNumber: `নোটিশ/${year}/০০১`,
      memoNumber: `স্মারক-নোটিশ/${year}/০০১`,
      serialNumber: 1,
      title: 'পরিচালনা পরিষদের মাসিক সাধারণ সভা আহ্বান সংক্রান্ত নোটিশ',
      documentDate: todayStr,
      timeStr: 'বাদ মাগরিব (সন্ধ্যা ৬:৪৫)',
      venueStr: 'মসজিদ কনফারেন্স রুম / ২য় তলা',
      recipientType: 'MEMBERS',
      recipientName: 'পরিচালনা পরিষদের সম্মানিত সকল সদস্যবৃন্দ',
      body: `<p>এতদ্বারা <strong>${mosqueName}</strong>-এর পরিচালনা পরিষদের সম্মানিত সকল সদস্য মহোদয়কে জানানো যাচ্ছে যে, আগামী শুক্রবার বাদ মাগরিব মসজিদ কার্যালয়ে এক সাধারণ সভা অনুষ্ঠিত হবে।</p>
<p><strong>আলোচ্যসূচি (Agenda):</strong></p>
<ol>
  <li>বিগত সভার কার্যবিবরণী পাঠ ও সর্বসম্মত অনুমোদন।</li>
  <li>চলতি মাসের আয়-ব্যয় হিসাব পর্যালোচনা ও ক্যাশ স্থিতি রিপোর্ট পেশ।</li>
  <li>আসন্ন পবিত্র রমজানুল মোবারক উপলক্ষে তারাবি ও ইফতার প্রস্তুতি।</li>
  <li>মসজিদের অজুখানা ও উত্তর পাশের মেঝের উন্নয়নমূলক কাজ।</li>
</ol>
<p>উক্ত সভায় যথাসময়ে উপস্থিত থেকে সুচিন্তিত মতামত প্রদানের জন্য বিনীত অনুরোধ জানানো হলো।</p>`,
      summary: 'পরিচালনা পরিষদের মাসিক নিয়মিত সভা ও রমজানের পূর্ব প্রস্তুতি সভা আহ্বান।',
      status: 'APPROVED',
      priority: 'HIGH',
      visibility: 'PUBLIC',
      includeLetterhead: true,
      signatories: [
        { id: 'sig-1', title: 'সাধারণ সম্পাদক', name: 'আলহাজ্ব মো: রফিকুল ইসলাম', designation: 'সাধারণ সম্পাদক', signed: true, signedAt: todayStr },
        { id: 'sig-2', title: 'সভাপতি', name: 'জনাব মো: নুরুল হুদা চৌধুরী', designation: 'সভাপতি', signed: true, signedAt: todayStr }
      ],
      attachments: [],
      createdBy: 'user-admin',
      createdByName: 'অ্যাডমিন',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      auditTrail: [
        {
          action: 'CREATE',
          performedBy: 'user-admin',
          performedByName: 'অ্যাডমিন',
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          notes: 'নোটিশ খসড়া তৈরি ও অনুমোদন সম্পন্ন।'
        }
      ]
    },

    // 2. দরখাস্ত / আবেদন (Application)
    {
      id: 'doc-app-001',
      mosqueId,
      docType: 'APPLICATION',
      subType: 'LEAVE_APPLICATION',
      documentNumber: `আবেদন/${year}/০০১`,
      applicationNumber: `আবেদন-${year}/০০১`,
      serialNumber: 1,
      title: 'পবিত্র ওমরাহ পালনের উদ্দেশ্যে ১৫ দিনের নৈমিত্তিক ছুটির আবেদন',
      documentDate: todayStr,
      senderName: 'মাওলানা হাফেজ মুফতি আব্দুল্লাহ',
      senderDesignation: 'সম্মানিত পেশ ইমাম ও খতিব',
      recipientType: 'ORGANIZATION',
      recipientName: 'সভাপতি / সাধারণ সম্পাদক, পরিচালনা পরিষদ',
      body: `<p>বরাবর,<br>সভাপতি / সাধারণ সম্পাদক<br>পরিচালনা পরিষদ, <strong>${mosqueName}</strong></p>
<p><strong>বিষয়: পবিত্র ওমরাহ পালনের উদ্দেশ্যে ১৫ দিনের নৈমিত্তিক ছুটির আবেদন।</strong></p>
<p>মহোদয়,<br>বিনীত নিবেদন এই যে, আমি নিম্নস্বাক্ষরকারী আপনার ঐতিহ্যবাহী মসজিদে পেশ ইমাম হিসেবে নিয়োজিত আছি। পবিত্র ওমরাহ হজের উদ্দেশ্যে আগামী ১০ দিন পর থেকে মোট ১৫ দিনের জন্য সৌদি আরব গমন করতে ইচ্ছুক।</p>
<p>আমার ছুটিকালীন সময়ে নামাজের জামাত পরিচালনার দায়িত্ব সম্মানিত সহকারী ইমাম ও মুয়াজ্জিন সাহেব যথাযথভাবে সম্পন্ন করবেন।</p>
<p>অতএব, প্রার্থনা এই যে—আমার আবেদনটি সদয় মঞ্জুর করে ওমরাহ পালনে যাওয়ার অনুমতি প্রদানে বাধিত করবেন।</p>`,
      summary: 'পেশ ইমাম সাহেবের ওমরাহ হজের জন্য ১৫ দিনের ছুটির আবেদন।',
      status: 'APPROVED',
      priority: 'NORMAL',
      visibility: 'RESTRICTED',
      actionTaken: 'পরিচালনা পরিষদের জরুরি বৈঠকে পেশ ইমাম সাহেবের ছুটি মঞ্জুর করা হয়েছে এবং মুয়াজ্জিন সাহেবকে ভারপ্রাপ্ত ইমামতি পালনের নির্দেশ দেওয়া হয়েছে।',
      resolvedAt: todayStr,
      includeLetterhead: false,
      signatories: [
        { id: 'sig-1', title: 'আবেদনকারী', name: 'মাওলানা হাফেজ মুফতি আব্দুল্লাহ', designation: 'পেশ ইমাম', signed: true, signedAt: todayStr },
        { id: 'sig-2', title: 'মঞ্জুরকারী (সভাপতি)', name: 'জনাব মো: নুরুল হুদা চৌধুরী', designation: 'সভাপতি', signed: true, signedAt: todayStr }
      ],
      attachments: [],
      createdBy: 'user-admin',
      createdByName: 'অ্যাডমিন',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: todayStr,
      auditTrail: [
        {
          action: 'CREATE',
          performedBy: 'user-admin',
          performedByName: 'অ্যাডমিন',
          timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
          notes: 'ছুটির আবেদন নিবন্ধিত।'
        },
        {
          action: 'STATUS_CHANGE',
          performedBy: 'user-admin',
          performedByName: 'অ্যাডমিন',
          timestamp: todayStr,
          notes: 'আবেদন মঞ্জুর ও অনুমোদিত।'
        }
      ]
    },

    // 3. ঘোষণা (Announcement)
    {
      id: 'doc-ann-001',
      mosqueId,
      docType: 'ANNOUNCEMENT',
      subType: 'JUMMAH_ANNOUNCEMENT',
      documentNumber: `ঘোষণা/${year}/০০১`,
      serialNumber: 1,
      title: 'জুমার জামাত পূর্ববর্তী অফিসিয়াল ঘোষণা ও উন্নয়ন তহবিল রিপোর্ট',
      documentDate: todayStr,
      recipientType: 'PUBLIC',
      recipientName: 'মসজিদের সম্মানিত মুসল্লিয়ানে কেরাম',
      body: `<p><strong>আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহ।</strong></p>
<p>সম্মানিত মুসল্লি ভাই ও বোনেরা, <strong>${mosqueName}</strong> পরিচালনা পরিষদের পক্ষ হতে আজকের গুরুত্বপূর্ণ তথ্যাবলি:</p>
<p>১. মসজিদের নতুন সোলার প্যানেল স্থাপন কাজ সমাপ্ত হয়েছে এবং আলহামদুলিল্লাহ বিদ্যুৎ সাশ্রয় শুরু হয়েছে।<br>
২. আগামী রোববার থেকে বাদ ফজর বয়স্কদের বিশুদ্ধ কুরআন শিক্ষা কোর্স আরম্ভ হবে।<br>
৩. মসজিদের অজুখানার সংস্কার কাজের জন্য মুসল্লিদের স্বেচ্ছাদানের আহ্বান জানানো হচ্ছে।</p>
<p>আল্লাহ তায়ালা আমাদের সকলের দান ও ইবাদত কবুল করুন। আমিন।</p>`,
      summary: 'জুমার আনুষ্ঠানিক বয়ান ও চলমান সংস্কার কাজের অগ্রগতি ঘোষণা।',
      status: 'APPROVED',
      priority: 'NORMAL',
      visibility: 'PUBLIC',
      includeLetterhead: true,
      signatories: [
        { id: 'sig-1', title: 'সাধারণ সম্পাদক', name: 'আলহাজ্ব মো: রফিকুল ইসলাম', designation: 'সাধারণ সম্পাদক', signed: true, signedAt: todayStr }
      ],
      attachments: [],
      createdBy: 'user-admin',
      createdByName: 'অ্যাডমিন',
      createdAt: todayStr,
      updatedAt: todayStr,
      auditTrail: [
        {
          action: 'CREATE',
          performedBy: 'user-admin',
          performedByName: 'অ্যাডমিন',
          timestamp: todayStr,
          notes: 'জুমার আনুষ্ঠানিক ঘোষণা তৈরি।'
        }
      ]
    },

    // 4. প্রেরিত পত্র (Outgoing Letter)
    {
      id: 'doc-out-001',
      mosqueId,
      docType: 'OUTGOING_LETTER',
      subType: 'GOV_LETTER',
      documentNumber: `স্মারক/${year}/০০১`,
      memoNumber: `স্মারক নং: ব.আ.জ.ম/প্রশা/${year}/০১৪`,
      serialNumber: 1,
      title: 'মসজিদের সামনের প্রধান সড়কে স্পিড ব্রেকার / গতিরোধক স্থাপনের আবেদন',
      documentDate: todayStr,
      senderName: 'সভাপতি / সাধারণ সম্পাদক',
      senderDesignation: 'পরিচালনা পরিষদ',
      recipientType: 'GOV_OFFICE',
      recipientName: 'উপজেলা নির্বাহী অফিসার (ইউএনও)',
      recipientOrg: 'উপজেলা প্রশাসন',
      recipientAddress: 'উপজেলা পরিষদ কার্যালয়',
      body: `<p>স্মারক নং: <strong>ব.আ.জ.ম/প্রশা/${year}/০১৪</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;তারিখ: <strong>${todayStr}</strong></p>
<p>বরাবর,<br><strong>উপজেলা নির্বাহী অফিসার (ইউএনও)</strong><br>উপজেলা পরিষদ কার্যালয়</p>
<p><strong>বিষয়: ${mosqueName}-এর সম্মুখস্থ সড়কে মুসল্লি ও পথচারীদের নিরাপত্তার্থে গতিরোধক (Speed Breaker) স্থাপনের আবেদন।</strong></p>
<p>জনাব,<br>সম্মানপূর্বক বিনীত নিবেদন এই যে, <strong>${mosqueName}</strong> অত্র উপজেলার একটি ব্যস্ততম স্থানে অবস্থিত। দৈনিক ৫ ওয়াক্ত নামাজে শত শত মুসল্লি ও শিশু শিক্ষার্থী উক্ত রাস্তা অতিক্রম করেন। দ্রুতগতির যানবাহনের কারণে প্রায়ই দুর্ঘটনার আশঙ্কা বিরাজ করে।</p>
<p>এমতাবস্থায়, মুসল্লি ও সাধারণ পথচারীদের জীবনের নিরাপত্তা নিশ্চিতকল্পে মসজিদের উভয় পাশে দুটি স্ট্যান্ডার্ড গতিরোধক স্থাপনের জন্য আপনার সদয় প্রশাসনিক নির্দেশনা ও সহায়তা কামনা করছি।</p>`,
      summary: 'মসজিদের সামনের রাস্তায় গতিরোধক স্থাপনের জন্য ইউএনও মহোদয় বরাবর স্মারকপত্র।',
      status: 'SENT',
      priority: 'HIGH',
      visibility: 'RESTRICTED',
      dispatchMethod: 'HAND_DELIVERY',
      dispatchedAt: todayStr,
      replyRequired: true,
      includeLetterhead: true,
      signatories: [
        { id: 'sig-1', title: 'সাধারণ সম্পাদক', name: 'আলহাজ্ব মো: রফিকুল ইসলাম', designation: 'সাধারণ সম্পাদক', signed: true, signedAt: todayStr },
        { id: 'sig-2', title: 'সভাপতি', name: 'জনাব মো: নুরুল হুদা চৌধুরী', designation: 'সভাপতি', signed: true, signedAt: todayStr }
      ],
      attachments: [],
      createdBy: 'user-admin',
      createdByName: 'অ্যাডমিন',
      createdAt: todayStr,
      updatedAt: todayStr,
      auditTrail: [
        {
          action: 'CREATE',
          performedBy: 'user-admin',
          performedByName: 'অ্যাডমিন',
          timestamp: todayStr,
          notes: 'সরকারি দপ্তরে প্রেরিত স্মারকপত্র তৈরি ও রওয়ানা।'
        }
      ]
    },

    // 5. প্রাপ্ত পত্র (Incoming Letter)
    {
      id: 'doc-in-001',
      mosqueId,
      docType: 'INCOMING_LETTER',
      subType: 'INCOMING_RECORD',
      documentNumber: `প্রাপ্তি/${year}/০০১`,
      memoNumber: `স্মারক: ইফা/জেকা/২০২৬/৮৮২`,
      serialNumber: 1,
      title: 'ইসলামিক ফাউন্ডেশন হতে জাতীয় বৃক্ষরোপণ কর্মসূচি পালন সংক্রান্ত পত্র',
      documentDate: todayStr,
      senderName: 'উপ-পরিচালক',
      senderOrg: 'ইসলামিক ফাউন্ডেশন জেলা কার্যালয়',
      senderAddress: 'জেলা সদর',
      recipientType: 'ORGANIZATION',
      recipientName: 'সভাপতি / সাধারণ সম্পাদক, ' + mosqueName,
      body: `<p><strong>প্রাপ্তি ক্রমিক:</strong> ০০১ &nbsp;|&nbsp; <strong>স্মারক নং:</strong> ইফা/জেকা/২০২৬/৮৮২ &nbsp;|&nbsp; <strong>প্রাপ্তির তারিখ:</strong> ${todayStr}</p>
<p><strong>প্রেরক:</strong> উপ-পরিচালক, ইসলামিক ফাউন্ডেশন জেলা কার্যালয়<br>
<strong>বিষয়: পরিবেশ সংরক্ষণে মসজিদ চত্বর ও ওয়াকফ জমিতে ফলজ ও ওষধি বৃক্ষরোপণ কর্মসূচি বাস্তবায়ন।</strong></p>
<p><strong>পত্রের সারসংক্ষেপ:</strong><br>
আসন্ন বর্ষা মৌসুমে সকল জাতীয় ও স্থানীয় মসজিদ প্রাঙ্গণে কমপক্ষে ২০টি করে বৃক্ষরোপণ ও নিয়মিত পরিচর্যার জন্য নির্দেশনা প্রদান করা হয়েছে।</p>
<p><strong>গৃহীত সিদ্ধান্ত ও করণীয়:</strong><br>
পরিচালনা পরিষদের উন্নয়ন সাব-কমিটিকে আগামী সপ্তাহের মধ্যে ৫০টি ফলজ গাছের চারা সংগ্রহ ও রোপণ কার্যক্রম বাস্তবায়নের দায়িত্ব দেওয়া হয়েছে।</p>`,
      summary: 'ইসলামিক ফাউন্ডেশন জেলা কার্যালয় থেকে বৃক্ষরোপণ সংক্রান্ত সরকারি পত্র প্রাপ্তি ও রেজিস্ট্রিকরণ।',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      visibility: 'RESTRICTED',
      actionTaken: 'উন্নয়ন উইংকে চারা রোপণের দায়িত্ব অর্পণ।',
      includeLetterhead: false,
      signatories: [
        { id: 'sig-1', title: 'প্রাপ্তিস্বীকারকারী', name: 'অফিস সহকারী / সাধারণ সম্পাদক', designation: 'সাধারণ সম্পাদক', signed: true, signedAt: todayStr }
      ],
      attachments: [],
      createdBy: 'user-admin',
      createdByName: 'অ্যাডমিন',
      createdAt: todayStr,
      updatedAt: todayStr,
      auditTrail: [
        {
          action: 'CREATE',
          performedBy: 'user-admin',
          performedByName: 'অ্যাডমিন',
          timestamp: todayStr,
          notes: 'প্রাপ্ত পত্র ইনকামিং রেজিস্টারে নথিভুক্ত।'
        }
      ]
    },

    // 6. অফিস আদেশ (Office Order)
    {
      id: 'doc-ord-001',
      mosqueId,
      docType: 'OFFICE_ORDER',
      subType: 'DUTY_ASSIGNMENT',
      documentNumber: `অফিস/${year}/০০১`,
      memoNumber: `আদেশ নং: ব.আ.জ.ম/অআ/${year}/০০১`,
      serialNumber: 1,
      title: 'মসজিদের সার্বিক পরিচ্ছন্নতা ও জেনারেটর রক্ষণাবেক্ষণের দায়িত্ব বণ্টন আদেশ',
      documentDate: todayStr,
      effectiveDate: todayStr,
      recipientType: 'STAFF',
      recipientName: 'মোহাম্মদ করিম (প্রধান খাদেম) ও মো: আলী (সহকারী খাদেম)',
      body: `<p>অফিস আদেশ নং: <strong>ব.আ.জ.ম/অআ/${year}/০০১</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;তারিখ: <strong>${todayStr}</strong></p>
<p>এতদ্বারা <strong>${mosqueName}</strong>-এর সংশ্লিষ্ট কর্মচারীদের অবগতির জন্য জানানো যাচ্ছে যে, আজ থেকে মসজিদের সার্বিক শৃঙ্খলা ও রক্ষণাবেক্ষণ নিম্নরূপ বণ্টন করা হলো:</p>
<ol>
  <li><strong>প্রধান খাদেম:</strong> মূল নামাজ কক্ষ, মিম্বর, মেহরাব এবং জেনারেটর পরিচালনা ও ফুয়েল পরীক্ষা।</li>
  <li><strong>সহকারী খাদেম:</strong> অজুখানা, ওয়াশরুম, বাথরুম দিনে তিনবার জীবাণুনাশক দিয়ে পরিষ্কার করা এবং উত্তর গেট লক নিশ্চিত করা।</li>
</ol>
<p>এ আদেশ অবিলম্বে কার্যকর হবে এবং দায়িত্বে কোনো প্রকার অবহেলা গ্রহণযোগ্য হবে না।</p>`,
      summary: 'খাদেমদের কাজের নির্দিষ্ট শিডিউল ও পরিষ্কার-পরিচ্ছন্নতা বিষয়ক অফিশিয়াল আদেশ।',
      status: 'APPROVED',
      priority: 'HIGH',
      visibility: 'RESTRICTED',
      includeLetterhead: true,
      signatories: [
        { id: 'sig-1', title: 'সাধারণ সম্পাদক', name: 'আলহাজ্ব মো: রফিকুল ইসলাম', designation: 'সাধারণ সম্পাদক', signed: true, signedAt: todayStr },
        { id: 'sig-2', title: 'সভাপতি', name: 'জনাব মো: নুরুল হুদা চৌধুরী', designation: 'সভাপতি', signed: true, signedAt: todayStr }
      ],
      attachments: [],
      createdBy: 'user-admin',
      createdByName: 'অ্যাডমিন',
      createdAt: todayStr,
      updatedAt: todayStr,
      auditTrail: [
        {
          action: 'CREATE',
          performedBy: 'user-admin',
          performedByName: 'অ্যাডমিন',
          timestamp: todayStr,
          notes: 'অফিস আদেশ জারি করা হলো।'
        }
      ]
    },

    // 7. প্রত্যয়নপত্র / সনদ (Certificate)
    {
      id: 'doc-cert-001',
      mosqueId,
      docType: 'CERTIFICATE',
      subType: 'MEMBER_CERTIFICATE',
      documentNumber: `সনদ/${year}/০০১`,
      serialNumber: 1,
      title: 'পরিচালনা পরিষদের সিনিয়র সহ-সভাপতি হিসেবে দায়িত্বপালন সংক্রান্ত প্রত্যয়নপত্র',
      documentDate: todayStr,
      certificateFor: 'আলহাজ্ব মো: শামসুল হক',
      certificateSubject: 'কমিটি সদস্যপদ ও প্রশংসাপত্র',
      recipientType: 'INDIVIDUAL',
      recipientName: 'আলহাজ্ব মো: শামসুল হক',
      body: `<div style="text-align: center; margin-bottom: 24px;">
  <h2 style="font-size: 24px; font-weight: bold; margin: 0; color: #1e3a8a;">প্রত্যয়নপত্র ও প্রশংসাপত্র</h2>
  <p style="font-size: 13px; color: #64748b;">সনদ নং: সনদ/${year}/০০১ &nbsp;|&nbsp; তারিখ: ${todayStr}</p>
</div>
<p>এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, জনাব <strong>আলহাজ্ব মো: শামসুল হক</strong>, পিতা: মরহুম আব্দুল লতিফ, <strong>${mosqueName}</strong> পরিচালনা পরিষদের ২০২৪-২০২৬ মেয়াদে অত্যন্ত বিশ্বস্ততা, নিষ্ঠা ও সুনামের সাথে <strong>সিনিয়র সহ-সভাপতি</strong> হিসেবে দায়িত্ব পালন করছেন।</p>
<p>তিনি মসজিদের বহুতল ভবন নির্মাণ ও ওয়াকফ সম্পত্তি সংরক্ষণে অনন্য ভূমিকা রেখেছেন। তাঁর সামাজিক ও ধর্মীয় অবদান সর্বজনবিদিত ও প্রশংসনীয়।</p>
<p>আমি তাঁর দীর্ঘায়ু, সুস্বাস্থ্য ও ইহলৌকিক-পরলৌকিক সার্বিক সাফল্য কামনা করি।</p>`,
      summary: 'সিনিয়র সহ-সভাপতি মহোদয়ের অনুকূলে প্রশংসাপত্র ও সদস্যপদ প্রত্যয়নপত্র জারি।',
      status: 'APPROVED',
      priority: 'NORMAL',
      visibility: 'PUBLIC',
      includeLetterhead: true,
      signatories: [
        { id: 'sig-1', title: 'সভাপতি', name: 'জনাব মো: নুরুল হুদা চৌধুরী', designation: 'সভাপতি', signed: true, signedAt: todayStr }
      ],
      attachments: [],
      createdBy: 'user-admin',
      createdByName: 'অ্যাডমিন',
      createdAt: todayStr,
      updatedAt: todayStr,
      auditTrail: [
        {
          action: 'CREATE',
          performedBy: 'user-admin',
          performedByName: 'অ্যাডমিন',
          timestamp: todayStr,
          notes: 'প্রত্যয়নপত্র তৈরি ও মঞ্জুর।'
        }
      ]
    },

    // 8. সুপারিশপত্র (Recommendation)
    {
      id: 'doc-rec-001',
      mosqueId,
      docType: 'RECOMMENDATION',
      subType: 'GENERAL_RECOMMENDATION',
      documentNumber: `সুপারিশ/${year}/০০১`,
      serialNumber: 1,
      title: 'মেধাবী ও অসচ্ছল শিক্ষার্থীর উচ্চশিক্ষা বৃত্তির জন্য সুপারিশপত্র',
      documentDate: todayStr,
      recommendationFor: 'হাফেজ মো: তানভীর আহমেদ',
      recommendationReason: 'ইসলামিক বিশ্ববিদ্যালয়ে উচ্চশিক্ষা অধ্যয়ন ও অসচ্ছল পরিবার',
      recipientType: 'ORGANIZATION',
      recipientName: 'চেয়ারম্যান / ট্রাস্টি বোর্ড',
      recipientOrg: 'আল-ফালাহ শিক্ষা কল্যাণ ট্রাস্ট',
      body: `<p>সুপারিশ পত্র নং: <strong>সুপারিশ/${year}/০০১</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;তারিখ: <strong>${todayStr}</strong></p>
<p>বরাবর,<br><strong>চেয়ারম্যান / নির্বাহী পরিচালক</strong><br>আল-ফালাহ শিক্ষা কল্যাণ ট্রাস্ট</p>
<p><strong>বিষয়: হাফেজ মো: তানভীর আহমেদ-এর উচ্চশিক্ষা বৃত্তির অনুকূলে জোরালো সুপারিশ প্রদান প্রসঙ্গে।</strong></p>
<p>মহোদয়,<br>অত্যন্ত আনন্দের সাথে জানাচ্ছি যে, <strong>হাফেজ মো: তানভীর আহমেদ</strong>, পিতা: মো: লোকমান হাকিম, আমাদের <strong>${mosqueName}</strong>-এর একজন কৃতি সন্তান। তিনি অত্যন্ত সুনামের সাথে হিফজ সমাপ্ত করে বর্তমানে ইসলামিক বিশ্ববিদ্যালয়ে অনার্স কোর্সে সুযোগ পেয়েছেন।</p>
<p>তাঁর পিতা একজন সাধারণ দিনমজুর এবং আর্থিক অনটনের কারণে তাঁর উচ্চশিক্ষা চালিয়ে নেওয়া অত্যন্ত দুরূহ হয়ে পড়েছে। তানভীর একজন বিনম্র, চরিত্রবান ও প্রখর মেধাবী ছাত্র।</p>
<p>অতএব, তাঁর মেধা ও শিক্ষাজীবন রক্ষার্থে আপনার ট্রাস্টের পক্ষ হতে শিক্ষাবৃত্তি প্রদানের জন্য মসজিদ পরিচালনা পরিষদের পক্ষ থেকে বিশেষ সুপারিশ জ্ঞাপন করছি।</p>`,
      summary: 'মেধাবী শিক্ষার্থীর জন্য ট্রাস্টে উচ্চশিক্ষা বৃত্তির অফিশিয়াল সুপারিশপত্র।',
      status: 'APPROVED',
      priority: 'HIGH',
      visibility: 'RESTRICTED',
      includeLetterhead: true,
      signatories: [
        { id: 'sig-1', title: 'পেশ ইমাম', name: 'মাওলানা হাফেজ মুফতি আব্দুল্লাহ', designation: 'পেশ ইমাম', signed: true, signedAt: todayStr },
        { id: 'sig-2', title: 'সভাপতি', name: 'জনাব মো: নুরুল হুদা চৌধুরী', designation: 'সভাপতি', signed: true, signedAt: todayStr }
      ],
      attachments: [],
      createdBy: 'user-admin',
      createdByName: 'অ্যাডমিন',
      createdAt: todayStr,
      updatedAt: todayStr,
      auditTrail: [
        {
          action: 'CREATE',
          performedBy: 'user-admin',
          performedByName: 'অ্যাডমিন',
          timestamp: todayStr,
          notes: 'সুপারিশপত্র তৈরি ও সত্যায়িত।'
        }
      ]
    }
  ];
}
