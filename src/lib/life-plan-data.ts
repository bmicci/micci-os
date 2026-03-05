// ============================================================
// LIFE PLAN DATA — Brandon's Master Goals
// Static data layer. DB persists goal states + custom additions.
// ============================================================

export interface GoalCategory {
  header: string | null
  goals: string[]
}

export interface Timeframe {
  label: string
  categories: GoalCategory[]
}

export interface PinnedGroup {
  label: string
  goals: string[]
}

export interface AllAgesSubcategory {
  header: string
  goals: string[]
}

export interface AllAgesGroup {
  label: string
  items?: string[]
  goals?: string[]
  subcategories?: AllAgesSubcategory[]
}

export interface FoundationData {
  vision: string
  roleModels: string[]
  coreValues: { name: string; desc: string }[]
  passions: {
    energize: string[]
    talkAbout: string[]
    recharge: string[]
    mostMyself: string[]
  }
  passionSummary: string
  purpose: string
  avoid: {
    people: string[]
    habits: string[]
    environments: string[]
    mindsets: string[]
  }
  avoidSummary: string
}

export interface RitualsData {
  gratitude: string[]
  gratitudeSummary: string
  affirmations: string[]
  reminders: string[]
}

export interface Section {
  id: string
  name: string
  colorHex: string
  isFoundation?: boolean
  isRituals?: boolean
  isVision?: boolean
  timeframes?: Record<string, Timeframe>
  pinned?: PinnedGroup[]
  allAges?: AllAgesGroup[]
}

// ── FOUNDATION ───────────────────────────────────────────────
export const FOUNDATION_DATA: FoundationData = {
  vision:
    "A successful marriage and family with 2–3 kids. A successful and prosperous career where I eventually move up into the C-Suite office (CIO/CDO by 45, CEO by 50) and eventually branch off and start my own business or have multiple revenue streams with lots of passive income. Obtain my MBA from a top 10 program. A large 7K sq ft home with a large yard and a pool and guest house. Vacation homes in Florida, Colorado, Costa Rica, and Italy. Serve on multiple boards. Become a public figure in the business world. Write a book. Be on the cover of Forbes/Fortune. Start a large nonprofit. Eventually serve in political/public office—Governor as the ultimate capstone. Leave a legacy of impact and philanthropy.",
  roleModels: ['Ray Dalio', 'Simon Sinek', 'Julius Caesar', 'Ronald Reagan'],
  coreValues: [
    { name: 'Family & Legacy', desc: 'Building a strong family foundation; being remembered; leaving something behind that matters' },
    { name: 'Wealth & Financial Freedom', desc: 'Building substantial wealth; multiple income streams; never being financially dependent or constrained; abundance' },
    { name: 'Health & Vitality', desc: 'Physical fitness, mental wellness, longevity—the foundation everything else is built on' },
    { name: 'Ambition & Growth', desc: 'Relentless advancement; refusing to settle; if you\'re not moving forward, you\'re not winning' },
    { name: 'Vision & Impact', desc: 'Meaningful work; high-tech and futuristic thinking; leaving a profound mark on the world' },
    { name: 'Integrity & Character', desc: 'Doing what is morally right regardless of personal setbacks; unwavering principles' },
    { name: 'Faith & Community', desc: 'Growing closer to God; finding a church home; developing spiritually in an area I\'ve neglected' },
    { name: 'Adventure & Exploration', desc: 'Seeing the world; new experiences; living a full life—not just existing' },
    { name: 'Leadership & Influence', desc: 'Leading others; shaping the future; world recognition; POTUS-level ambition to leave a legacy people remember' },
  ],
  passions: {
    energize: [
      'Working out and pushing my body',
      'Public speaking and commanding a room',
      'Innovating and problem solving',
      'Crafting strategy and big-picture thinking',
      'Cooking challenging gourmet meals',
      'Traveling the world and exploring new places and cultures',
      'Entertaining others and hosting parties',
      'Networking with like-minded people',
      'Mind-stimulating conversations',
    ],
    talkAbout: [
      'Fitness, health, and biohacking',
      'Optimizing results from training and nutrition',
      'AI and the advancement of technology',
      'Data, analytics, and IoT/smart devices',
      'History (geeking out on it)',
      'Engineering and technology',
      'Business strategy',
      'Stocks, investments, and making money',
      'Travel stories and trips I\'ve gone on',
    ],
    recharge: [
      'Travel and exploring new places',
      'Working out',
      'Cooking and entertaining',
      'Building things (Legos, projects)',
      'Being in nature / outdoors',
      'Spa and recovery—relaxing, unwinding',
    ],
    mostMyself: [
      'Most confident: When leading a room or presenting',
      'Most relaxed: After a relaxing spa day or meditation',
      'Most energized: After crushing an intense workout',
      'Most content: When traveling and experiencing new cultures',
      'Most connected: When having a stimulating, thought-provoking conversation',
    ],
  },
  passionSummary:
    "I\'m passionate about innovation, strategy, and solving complex problems—especially at the intersection of AI, technology, and business. I thrive when I\'m pushing my body through fitness, exploring new places and cultures, and hosting and connecting with like-minded people over great food and stimulating conversation. I geek out on history, biohacking, investments, and anything engineering or tech-related. I feel most alive when I\'m building something meaningful, learning, and advancing.",
  purpose:
    'To go from business visionary to world leader—creating technologies that transform how we live, then rising to global influence to unite nations and build a better future.',
  avoid: {
    people: [
      'Negative and pessimistic people',
      'Doubtful people who don\'t believe in me or my vision',
      'Jealous or envious people',
      'Selfish people who don\'t reciprocate—only around when they need something',
      'People who don\'t match my energy',
      'People with victim mentalities',
    ],
    habits: [
      'Doom scrolling and mindless phone use—need to be more present and focused',
      'Procrastination',
      'Staying up late',
      'Playing video games for too long',
      'Self-doubt spirals when setbacks pile up',
    ],
    environments: [
      'Work environments where I\'m underutilized, undervalued, and not challenged',
      'Places where I\'m not set up for success or given room to grow',
      'Situations where I feel stuck or used below my potential',
    ],
    mindsets: [
      'Perfectionism—can\'t let perfect be the enemy of good',
      'Negative thinking and hopelessness when setbacks compound',
      'Unhealthy comparison to others—use it as fuel, not as a measure of self-worth',
    ],
  },
  avoidSummary:
    "To live a happier and more fulfilling life, I need to limit time with negative, pessimistic, doubtful, jealous, or selfish people—anyone who doesn't match my energy or operates with a victim mentality. I need to break habits that steal my focus and time: doom scrolling, mindless phone use, procrastination, staying up late, and excessive video games. I want to be more present and intentional. I need to leave environments where I\'m underutilized, undervalued, or not challenged—places that keep me stuck rather than pushing me forward. I need to manage my mindset: let go of perfectionism, avoid spiraling into negative thinking when setbacks pile up, and stop using comparison as a measure of worth—instead using it as fuel for growth.",
}

// ── RITUALS ──────────────────────────────────────────────────
export const RITUALS_DATA: RitualsData = {
  gratitude: [
    'True friends and family who I talk to regularly and know will always be there',
    'Everything I\'ve accomplished—I\'ve worked hard for it',
    'My resilience and determination—nothing has come easy, but that\'s built my strength',
    'The hard things I\'ve overcome—they\'ve shaped who I am',
    'My health and genetics—to be almost 40 and still fit, healthy, and young-looking is a blessing',
    'The experiences and places I\'ve traveled—I\'ve truly lived',
  ],
  gratitudeSummary:
    "I\'m grateful for the true friends and family in my life—the people I know will always be there. I\'m grateful for everything I\'ve accomplished and the hard things I\'ve overcome. Nothing has ever come easy for me, but that\'s given me pride in my resilience and determination. I\'m thankful for my health and genetics—to be almost 40 and still fit, healthy, and young-looking is something I don\'t take for granted. And I\'m grateful for the experiences and places I\'ve traveled—I\'ve truly lived.",
  affirmations: [
    'I am building generational wealth and a legacy that lasts.',
    'I am a visionary leader who creates real impact.',
    'I lead with integrity and excellence in everything I do.',
    'I am in the best shape of my life—mentally and physically.',
    'I attract abundance, opportunity, and meaningful relationships.',
    'I am unstoppable when I focus.',
    'I am rising to global influence and building a better future.',
    'I have overcome hard things before. I will overcome again.',
    'I am resilient, determined, and relentless.',
    'My best days are ahead of me.',
    'Despite past heartbreaks, my heart is open and my best love story is ahead of me.',
  ],
  reminders: [
    'Progress over perfection.',
    'Stay patient—the vision is long-term.',
    'Comparison is the thief of joy. Use it as fuel, not a scorecard.',
    'I\'ve overcome harder. I\'ll overcome this.',
    'Put the phone down. Be present.',
    'I\'m not stuck—I\'m in transition.',
    'The setback is setting up the comeback.',
    'Trust the process. Trust yourself.',
    'Not everyone is meant to go where I\'m going.',
    'My worth is not defined by my current situation.',
  ],
}

// ── GOAL SECTIONS ─────────────────────────────────────────────
export const SECTIONS: Section[] = [
  {
    id: 'health',
    name: 'Health & Fitness',
    colorHex: '#C1121F',
    timeframes: {
      '40': {
        label: '1 YEAR (Age 40)',
        categories: [
          { header: 'Physique & Weight:', goals: ['Complete 75 Hard (Q1)', 'Lose 10–15 lbs (210 → 195–190)', 'Goal weight under 200 lbs (stretch: 190)', 'Body fat down to 12% (from 14.5%)', 'Visible abs / lose love handles', 'Stronger core and obliques', 'Strengthen legs, glutes, lower back', 'Thinner jawline / more refined face structure'] },
          { header: 'Health & Wellness:', goals: ['Heal gut issues (IBS)', 'Healthier skin / less wrinkles / look younger', 'Whiter teeth', 'Limit alcohol substantially or altogether'] },
          { header: 'Fitness Routine:', goals: ['Get back into yoga — start taking classes', 'Join a bootcamp class', 'Find a fit crew / fitness community in Dallas', 'Focus on recovery — join a recovery clinic (cryo, sauna, cold plunge)'] },
          { header: 'Flexibility & Mobility:', goals: ['Stretch more / become more flexible', 'Regular mobility work'] },
          { header: 'Biohacking & Longevity:', goals: ['Continue TRT treatments', 'HGH or Sermorelin', 'hCG / fertility treatments', 'Peptides (BPC-157, others for longevity/healing)', 'Regular bloodwork (2x/year)'] },
        ],
      },
      '45': {
        label: '5 YEARS (Age 45)',
        categories: [
          { header: 'Physique:', goals: ['Maintain peak fitness and performance', 'Weight at 190 or below', 'Stay lean at 10–12% body fat', 'Visible abs maintained', 'Alcohol-free except very special occasions'] },
          { header: 'Ideal Weekly Routine:', goals: ['Gym 5–7 days/week', 'Yoga 2–3x/week', 'Mix of lifting and bootcamp classes', 'Walk outdoors 3–4 days/week', 'Cycling on non-walk days'] },
          { header: 'Sports & Activities:', goals: ['Tennis (solid player)', 'Golf (playing regularly)', 'Cycling (regular + big cycling trips)', 'Hiking trips annually', 'Skiing annually', 'Camping / outdoor activities'] },
          { header: 'Martial Arts & Tactical:', goals: ['Tactical self-defense and shooting', 'Krav Maga / MMA', 'Tactical training courses'] },
          { header: 'Biohacking & Longevity:', goals: ['Hormone optimization continued', 'Peptides for longevity and healing', 'Stem cell treatments', 'Annual fitness retreat'] },
        ],
      },
      '50': {
        label: '10 YEARS (Age 50)',
        categories: [
          { header: null, goals: ["Still active and in peak shape", "Visible abs maintained, 10–12% body fat", "Look like I\'m in my 40s or late 30s", "Tennis, golf, cycling, skiing, hiking regularly", "Complete a famous hike/climb", "Complete a famous cycling challenge", "Advanced longevity treatments (NAD+, glutathione, stem cells)", "Sauna in house", "Wake up pain-free, feel 20 years younger"] },
        ],
      },
      '60': {
        label: '20 YEARS (Age 60)',
        categories: [
          { header: null, goals: ["Still maintaining abs and low body fat", "Fit, energized, and active", "More yoga, walking, regenerative activities", "Golf, tennis, cycling, skiing, hiking", "Playing with grandkids", "Feel like I\'m 40 — energized, pain-free, thriving"] },
        ],
      },
    },
  },
  {
    id: 'career',
    name: 'Business & Career',
    colorHex: '#0077B6',
    timeframes: {
      '40': {
        label: '1 YEAR (Age 40)',
        categories: [
          { header: 'Role & Compensation:', goals: ['VP at Fintech, Digital Bank, or Hyperscaler', 'Total comp: $300–400K+ (base $230–260K)', 'Negotiate sign-on bonus $50–100K'] },
          { header: 'Skills & Development:', goals: ['Sharpen executive presence and board-readiness', 'Find C-suite mentor (CIO/CTO/CDO/CAIO)', 'Find political mentor', 'Maximize executive coach benefit'] },
          { header: 'Thought Leadership:', goals: ['2–3 AI conference speaking engagements', 'LinkedIn to 7K+ followers', '1–2 podcast appearances', 'Build media relationships'] },
          { header: 'Network:', goals: ['Join 1–2 executive networks (YPO, Pavilion)', 'Expand network in AI and fintech'] },
        ],
      },
      '45': {
        label: '5 YEARS (Age 45)',
        categories: [
          { header: 'Role & Compensation:', goals: ['SVP/EVP at Fortune 100 OR C-Suite at mid-size company', 'Total comp: $500K–$1M', '$100–200K in vested RSUs/equity'] },
          { header: 'Thought Leadership:', goals: ['5+ keynotes/year', 'TEDx talk completed', 'Book in progress', 'Featured in WSJ, Forbes, Fortune', 'TV appearances (Fox Business, Bloomberg, CNBC)', 'LinkedIn 25K+ followers'] },
          { header: 'Network & Politics:', goals: ['50+ C-suite connections', 'Inner circle of 10 trusted advisors', 'Know local politicians, congressmen, senators', '5+ political fundraisers/year (Republican Party)'] },
          { header: 'Boards:', goals: ['1–2 board seats (nonprofit/advisory/startup)', '$25–50K/year board income'] },
        ],
      },
      '50': {
        label: '10 YEARS (Age 50)',
        categories: [
          { header: 'Role & Compensation:', goals: ['C-Suite Fortune 500 (CIO/CDO/CAIO/CEO)', 'Total comp: $1–3M+', '$500K–$1M in vested RSUs/equity'] },
          { header: 'Thought Leadership:', goals: ['Book published (bestseller goal)', 'Ring the bell on Wall Street', 'Davos / World Economic Forum attendee', 'Congress testimony on AI/tech', 'Forbes/Fortune lists and covers', 'Speaking fees $25–50K+'] },
          { header: 'Network & Politics:', goals: ['100+ C-suite connections', 'Know governors, national figures', 'Major donor status; exploratory discussions about running'] },
          { header: 'Boards:', goals: ['1–2 public company boards, 3–4 total'] },
        ],
      },
      '60': {
        label: '20 YEARS (Age 60)',
        categories: [
          { header: null, goals: ['CEO / Board Portfolio / Political transition', 'Total comp: $3–5M (or $1M+ board income)', 'Speaking circuit $50–100K+ per appearance', 'Household name in business and politics', 'Inner circle of kingmakers and power brokers', 'Ready to run or in political career', '1+ Fortune 500 board seat, Chair of 1 board'] },
        ],
      },
    },
  },
  {
    id: 'relationships',
    name: 'Relationships & Romance',
    colorHex: '#E63946',
    timeframes: {
      '40': {
        label: '1 YEAR (Age 40)',
        categories: [
          { header: null, goals: ['Starting fresh — finding her through apps, matchmaker, friends, social circles', 'Looking for: values alignment, ambitious, fitness-oriented, family-oriented, wants kids', 'Engaged by 2026 (flexible) — definitely by 2028', 'Dream: Propose in Italy', 'Regular date nights, quality time, 1–2 trips together', 'Partner joins on business trips when possible', 'Come home to family dinners every night'] },
        ],
      },
      '45': {
        label: '5 YEARS (Age 45)',
        categories: [
          { header: null, goals: ['Destination wedding in Italy (intimate gathering)', 'Honeymoon in Maldives', '2–3 kids by 45; done having kids by 45', 'Present, involved dad — coaching, quality time, teaching', 'Very strong marriage — divorce never an option', 'Weekly date nights, annual romantic trip (no kids)', 'Wife is stay-at-home if she chooses', 'Family joins on business trips often', 'Home: Dallas suburbs or bi-coastal Florida'] },
        ],
      },
      '50': {
        label: '10 YEARS (Age 50)',
        categories: [
          { header: null, goals: ['Marriage stronger than ever, still madly in love, best friends', '10-year anniversary trip somewhere incredible', 'Kids (ages 5–12): private school, thriving in academics, sports, arts', 'Close family, quality time, lots of time with grandparents', 'Dream house with pool; 2nd or 3rd vacation home'] },
        ],
      },
      '60': {
        label: '20 YEARS (Age 60)',
        categories: [
          { header: null, goals: ['Still traveling together, empty nest adventures', 'Wife comes on business trips', 'Kids (ages 15–22): attending top universities, well-adjusted, independent', 'Talk daily, visit at college monthly', 'Instilled: hard work, faith, integrity, ambition', 'Grandchildren post-60; very involved grandparent', 'Family compound near water or in Italy', '4–5 vacation homes; home base Florida or Texas'] },
        ],
      },
    },
  },
  {
    id: 'family',
    name: 'Family & Friends',
    colorHex: '#F4A261',
    timeframes: {
      '40': {
        label: '1 YEAR (Age 40)',
        categories: [
          { header: 'Parents:', goals: ['See parents weekly if possible (dinner or quality time)', 'Spend more intentional quality time with them', 'Annual family trip together'] },
          { header: 'Special Goal:', goals: ["Restore a classic car with Dad — do this while he\'s still here"] },
          { header: 'Extended Family:', goals: ['Talk to cousins once a month', 'Visit Austin cousins quarterly', 'Be more deliberate about staying connected', 'Big cousin gathering once a year'] },
          { header: 'Friendships:', goals: ['Build tight inner circle in Dallas', 'Weekly or bi-weekly dinners (business ideas, ventures, investments)', 'Visit lifetime best friends at least once this year'] },
          { header: 'Community:', goals: ['Volunteer more', 'Join 1–2 volunteer groups or nonprofits'] },
        ],
      },
      '45': {
        label: '5 YEARS (Age 45)',
        categories: [
          { header: 'Parents:', goals: ['See weekly or twice a week', 'Lots of time with parents and kids together', 'Kids spend plenty of time with both sets of grandparents'] },
          { header: 'Extended Family:', goals: ['Same cadence (monthly calls, quarterly visits)', 'Family gatherings twice a year now that kids are in picture'] },
          { header: 'Friendships:', goals: ['Inner circle of 8–12 top quality friends in Dallas', 'Annual trip with lifetime best friends', 'More frequent get-togethers'] },
          { header: 'Community & Philanthropy:', goals: ['Bigger involvement', 'Board seat on 1 nonprofit', 'Begin thinking about starting a foundation'] },
        ],
      },
      '50': {
        label: '10 YEARS (Age 50)',
        categories: [
          { header: 'Parents (ages ~85–87):', goals: ['Spend lots of quality time while still here', 'Big annual trip with parents, wife, and kids — see the world together', 'Cherish every moment'] },
          { header: 'Extended Family:', goals: ['Tighter than ever', 'Big family trips with both sides 1–2x/year'] },
          { header: 'Friendships:', goals: ['Inner circle grown to 15–20 globally (not just Dallas)'] },
          { header: 'Philanthropy:', goals: ['Foundation started (stretch goal)', 'Major donor / active in multiple charities', 'Focus areas: Children and cancer-related causes'] },
        ],
      },
      '60': {
        label: '20 YEARS (Age 60)',
        categories: [
          { header: 'Honor Parents\' Memory & Legacy:', goals: ['Name something after them (scholarship, foundation wing, building)', 'Annual family tradition to celebrate their lives', 'Philanthropy in their name', 'Legacy book or video documenting their story', 'Endowed scholarship', 'Family foundation named after them'] },
          { header: 'Extended Family:', goals: ['The one who brings everyone together', 'Organizes and plans family trips and gatherings', 'Patriarch role'] },
          { header: 'Friendships:', goals: ['Global circle of ~30 close-knit, successful, ambitious, like-minded individuals'] },
          { header: 'Philanthropy:', goals: ["Foundation grown significantly", "Causes: Anti-bullying (personal), children with disabilities/alternative learning, cancer, children's causes", '$500K–$1M/year philanthropic giving'] },
        ],
      },
    },
  },
  {
    id: 'finance',
    name: 'Finance',
    colorHex: '#2D6A4F',
    timeframes: {
      '40': {
        label: '1 YEAR (Age 40)',
        categories: [
          { header: 'Income:', goals: ['Total comp: $300–400K (base $230–260K)', 'Negotiate sign-on bonus $50–100K'] },
          { header: 'Net Worth:', goals: ['Current: ~$370K', 'Target: $450–500K'] },
          { header: '401K:', goals: ['Target: $230K', 'Max out contributions with new job', 'Maximize employer match from Day 1'] },
          { header: 'Brokerage:', goals: ['Restart with $10K'] },
          { header: 'Emergency Fund:', goals: ['Rebuild to 6 months expenses'] },
          { header: 'Debt:', goals: ['Consolidate $150K into HELOC', 'Pay down aggressively, free up cash flow'] },
          { header: 'Real Estate:', goals: ['Stay in current townhome', 'Goal: Turn into rental eventually', 'Begin exploring vacation homes in Florida'] },
        ],
      },
      '45': {
        label: '5 YEARS (Age 45)',
        categories: [
          { header: 'Income:', goals: ['Total comp: $500K–$1M', 'Board income: $25–50K/year'] },
          { header: 'Net Worth:', goals: ['Target: $2–2.5M'] },
          { header: 'Investments:', goals: ['401K: $600K', 'Brokerage: $200–250K', 'Equity/RSUs: $100–200K vested'] },
          { header: 'Real Estate:', goals: ['2 properties (main home + townhome as rental)', 'Fully debt-free'] },
        ],
      },
      '50': {
        label: '10 YEARS (Age 50)',
        categories: [
          { header: 'Income:', goals: ['Total comp: $1–3M+'] },
          { header: 'Net Worth:', goals: ['Target: $6–8M'] },
          { header: 'Investments:', goals: ['401K: $1.3M', 'Brokerage: $750K–$1M', 'Equity/RSUs: $500K–$1M vested', 'Real estate equity: $1.5–2M'] },
          { header: 'Passive Income ($10–15K/month):', goals: ['Rental income: $2–3K/month', 'Board seats (2–3): $4–6K/month', 'Speaking (6–10/year): $2–4K/month', 'Book royalties/consulting: $1–2K/month', 'Dividends: $1–2K/month'] },
        ],
      },
      '60': {
        label: '20 YEARS (Age 60)',
        categories: [
          { header: 'Income:', goals: ['Total comp: $3–5M (or $1M+ board income if retired)'] },
          { header: 'Net Worth:', goals: ['Target: $15–25M'] },
          { header: 'Investments:', goals: ['401K: $5M+', 'Brokerage: $2–5M', 'Real estate equity: $5M+'] },
          { header: 'Passive Income ($25–50K/month):', goals: ['Board income (3 boards): $10–15K/month', 'Rental income (2–3 properties): $5–8K/month', 'Speaking (10–15/year @ $50–100K): $5–10K/month', 'Investment dividends: $3–5K/month', 'Book royalties/IP: $1–2K/month', 'Consulting/advisory: $2–5K/month'] },
        ],
      },
    },
  },
  {
    id: 'home',
    name: 'Home & Lifestyle',
    colorHex: '#E76F51',
    timeframes: {
      '40': {
        label: '1 YEAR (Age 40) — Current Townhome',
        categories: [
          { header: null, goals: ['Furnish rooftop deck', 'Furnish patio', 'Finish decorating and furnishing current townhome', 'Optimize current home theater'] },
        ],
      },
      '45': {
        label: '5 YEARS (Age 45) — First Major Home Upgrade',
        categories: [
          { header: null, goals: ['Large home with pool', 'Home gym', 'Lego room', 'Wine cellar (starter)', 'Home theater — dedicated room', 'Outdoor kitchen with pizza oven & grill', 'Smart home — fully automated', 'Home office with views'] },
        ],
      },
      '50': {
        label: '10 YEARS (Age 50) — Dream Home',
        categories: [
          { header: 'Master Suite:', goals: ['His and hers walk-in closets (custom built)', 'Dual shower (spa-style)', 'Spa-style master bathroom with soaking tub', 'Fireplace in master bedroom', 'Private balcony off master', 'Morning kitchen / coffee bar in master suite'] },
          { header: 'Kitchen & Dining:', goals: ["Chef's kitchen with professional appliances (Wolf, Sub-Zero, etc.)", "Butler's pantry", 'Formal dining room for hosting dinner parties'] },
          { header: 'Living & Entertainment:', goals: ['Great room with soaring ceilings', 'Home theater / media room (dedicated)', 'Library / study with built-in bookshelves', 'Game room (poker table, billiards, arcade)', 'Music room / listening room', 'Bar area (wet bar or full bar)', 'Cigar lounge or whiskey room', 'Lego room', 'Arts & crafts room'] },
          { header: 'Wellness & Fitness:', goals: ['Home gym', 'Sauna / steam room'] },
          { header: 'Outdoor Living:', goals: ['Large yard with pool (indoor/outdoor with spa)', 'Hot tub / jacuzzi separate from pool', 'Outdoor kitchen with pizza oven & grill', 'Outdoor fireplace / fire pit', 'Cabana or pool house', 'Sport court (basketball, pickleball)', 'Bocce ball court', 'Putting green', 'Outdoor shower', 'Landscaped gardens / water features', 'Rooftop deck or terrace'] },
          { header: 'Functional & Tech:', goals: ['Wine cellar (temperature-controlled)', 'Car garage / showroom for collection', 'Guest house for family visits', 'Whole-home audio system (Sonos, etc.)', 'Integrated security system with cameras', 'Automated lighting, shades, and climate control', 'Voice-controlled everything', 'Dedicated server room / networking closet'] },
        ],
      },
      '60': {
        label: '20 YEARS (Age 60) — Legacy Home',
        categories: [
          { header: null, goals: ['All Age 50 features plus:', 'Indoor gun range', '4–5 properties total', 'Family compound near water or in Italy', 'Full car collection showroom', 'Staff quarters if needed'] },
        ],
      },
    },
  },
  {
    id: 'fun',
    name: 'Fun & Recreation',
    colorHex: '#7209B7',
    pinned: [
      {
        label: 'TOP 5 BUCKET LIST TRIPS',
        goals: ['SE Asia — Thailand, Vietnam, Indonesia, Cambodia', 'Egypt — Pyramids, Nile, ancient history', 'Machu Picchu — Hike the Inca Trail', 'Viking River Cruise — France & Germany with parents', 'African Safari — Kenya, Tanzania, or South Africa'],
      },
    ],
    allAges: [
      {
        label: 'Travel Cadence',
        items: ['2 big trips per year + 1 annual family trip with parents + a few weekend trips', 'Always 1 relaxing trip (beach or exotic) + 1 luxury or adventure trip', 'Style mix: luxury Europe or Asia with cultural immersion, plus one active/adventure trip'],
      },
      {
        label: 'Collecting',
        subcategories: [
          { header: 'Watches:', goals: ['Currently: Rolex collection', 'By 50: Add Audemars Piguet (AP) and Patek Philippe'] },
          { header: 'Cars:', goals: ['Near-term: Porsche 911 + G-Wagon or Range Rover', 'Mid-term: Porsche Panamera + Ferrari (dream car)', 'Long-term: Classic car collection'] },
          { header: 'Wine:', goals: ['Begin collecting from age 40 onward', 'Build a curated cellar'] },
          { header: 'Art:', goals: ['Mix of paintings, glass, and sculptures', 'Goal to own originals; build collection ages 40–60'] },
          { header: 'Legos:', goals: ['Continue collecting UCS sets', 'Dedicated Lego room in dream home'] },
        ],
      },
      {
        label: 'Hobbies',
        subcategories: [
          { header: 'Current (Age 40):', goals: ['Cooking (Italian, gourmet)', 'Fitness / strength training', 'Travel', 'Building Legos', 'Entertaining / hosting', 'Gaming'] },
          { header: 'Pick Up (Ages 40–45):', goals: ['Golf', 'Tennis', 'Cycling', 'Wine appreciation and collecting', 'Art collecting'] },
          { header: 'Continue & Add (Ages 45–60):', goals: ['Skiing', 'Hiking', 'Krav Maga / tactical shooting', 'Boating', 'Watch collecting', 'Car collecting'] },
        ],
      },
      {
        label: 'Experiences & Bucket List',
        subcategories: [
          { header: 'Travel & Adventure:', goals: ['Charter a yacht for a family vacation', 'Rent a villa in Italy for extended family', 'Helicopter tour experiences', 'Learn to sail', 'Race a car on a track (Porsche Experience)', "Get pilot's license (stretch goal)"] },
          { header: 'Hosting & Entertaining:', goals: ['Host an annual dinner party / gala at home', 'Host holiday gatherings as a family tradition', 'Private chef dinner parties at home', 'Michelin restaurant bucket list tour'] },
          { header: 'Sports & Signature Events:', goals: ['F1 Monaco Grand Prix (PRIORITY)', 'Super Bowl', 'The Masters', 'US Open Tennis (NYC)', 'Kentucky Derby', 'Cowboys & Stars box seats', 'VIP concerts and festival experiences'] },
        ],
      },
    ],
    timeframes: {
      '40': {
        label: '1 YEAR (Age 40) — Ideal Weekend',
        categories: [
          { header: null, goals: ['Early morning workout', 'Brunch with friends or family', 'Afternoon at country club (tennis or pool)', 'Dinner out with family or friends', 'Evening: live concert/music OR relaxing night at home with wine and grilling'] },
        ],
      },
      '45': {
        label: '5 YEARS (Age 45) — Ideal Weekend (With Family)',
        categories: [
          { header: null, goals: ['Morning workout or family activity', 'Day at beach, park, pool, or boating', 'Family dinner or BBQ', 'Time at country club', 'Relaxing together — quality time over everything'] },
        ],
      },
      '50': {
        label: '10 YEARS (Age 50) — Ideal Weekend',
        categories: [
          { header: null, goals: ['Morning golf or tennis', 'Family time at vacation home', 'Hosting friends and family for a dinner party', 'Wine from the cellar, home-cooked gourmet meal'] },
        ],
      },
      '60': {
        label: '20 YEARS (Age 60) — Ideal Weekend',
        categories: [
          { header: null, goals: ['Golf or tennis with friends or grandkids', 'Boating or relaxing at family compound', 'Multi-generational gatherings — the patriarch hosting everyone', 'Enjoying the life that was built'] },
        ],
      },
    },
  },
  {
    id: 'memberships',
    name: 'Memberships & Access',
    colorHex: '#264653',
    timeframes: {
      '40': {
        label: '1 YEAR (Age 40)',
        categories: [
          { header: null, goals: ['Life Time Fitness (current)', 'Recovery clinic membership (cryo, sauna, cold plunge)', 'Spa membership', 'Amex Fine Hotels & Resorts (current)', 'Research and establish Virtuoso travel advisor relationship', 'Country club membership'] },
        ],
      },
      '45': {
        label: '5 YEARS (Age 45)',
        categories: [
          { header: null, goals: ['Country club established', 'Golf club (prestigious course)', 'Social clubs (Soho House, private members clubs)', 'Wine club memberships (Napa, Tuscany)', 'Cigar club / whiskey society', 'Box seats: Dallas Cowboys & Dallas Stars', 'VIP concert and festival access', 'Art gallery / museum patron', 'Theater and symphony patron', 'Charity galas and fundraiser circuit'] },
        ],
      },
      '50': {
        label: '10 YEARS (Age 50)',
        categories: [
          { header: null, goals: ['Yacht club membership', 'Private aviation membership (NetJets, Wheels Up)', 'Charter a yacht with family', 'Virtuoso travel advisor — established long-term relationship', 'Active on charity gala circuit', 'Political donor circles (Republican Party)'] },
        ],
      },
      '60': {
        label: '20 YEARS (Age 60)',
        categories: [
          { header: null, goals: ['All memberships maintained', 'Elite / invite-only clubs (Bohemian Grove, Alfalfa Club level)', 'Davos / World Economic Forum access', 'Major political donor status'] },
        ],
      },
    },
  },
  {
    id: 'personal-dev',
    name: 'Personal Development',
    colorHex: '#2A9D8F',
    timeframes: {
      '40': {
        label: '1 YEAR (Age 40)',
        categories: [
          { header: 'Education & Credentials:', goals: ['Complete MIT Sloan: AI — Implications for Business Strategy (6-week online)', 'Enroll in Wharton: Generative AI & Business Transformation (in-person executive program)', 'Begin structured Spanish learning (Pimsleur + iTalki tutor)', 'Begin Italian — conversational basics for travel'] },
          { header: 'Communication & Leadership:', goals: ['Complete public speaking training (formal program)', 'Deliver first keynote at an industry event', 'Complete EQ assessment; begin structured executive coaching on vulnerability & trust', 'Complete structured negotiation training (Harvard PON or equivalent)'] },
          { header: 'Reading & Intellect:', goals: ['Read 12 books/year minimum — leadership, AI, philosophy, stoicism', 'Start a consistent reading habit with notes/reflection'] },
          { header: 'Personal Growth:', goals: ['Active therapy or executive coaching', 'Working on vulnerability, emotional openness, and presence', 'Annual silent retreat or leadership immersive — 5–7 days of disconnection and reset'] },
        ],
      },
      '45': {
        label: '5 YEARS (Age 45)',
        categories: [
          { header: 'Education & Credentials:', goals: ['Enrolled in or completing MIT Sloan Executive MBA (#1 globally ranked, FT 2026)', 'Harvard Kennedy School: Emerging Leaders completed (Age 42–43)', 'Harvard Kennedy School: Leadership for the 21st Century (Age 45–46)', 'NACD Board Leadership Fellow — Fortune 500 board readiness credential (Age 46)', 'Conversational Spanish — using in professional and social contexts in Dallas', 'Conversational Italian — using during Italy trips and with family'] },
          { header: 'Communication & Leadership:', goals: ['Deliver TEDx talk or major conference keynote', 'Leading 100+ person organization with measurable culture results', 'Mentor 3+ rising leaders formally', 'Applying negotiation skills in M&A, board, and policy contexts'] },
          { header: 'Reading & Writing:', goals: ['Deep reading in policy, history, theology', 'First draft of own book in progress', 'Reading list curated and shared with inner circle'] },
          { header: 'Personal Growth:', goals: ['Measurable growth in EQ, presence, and work-life integration', 'Fully present with partner and growing family', 'Annual leadership immersive or silent retreat maintained'] },
        ],
      },
      '50': {
        label: '10 YEARS (Age 50)',
        categories: [
          { header: 'Education & Credentials:', goals: ['MIT Sloan Executive MBA complete', 'Harvard Kennedy School: Technology & Public Leadership Certificate earned (requires 3 HKS programs)', 'Full credential stack established: MBA + HKS + NACD + MIT/Wharton programs', 'Business-level Spanish fluency — fully integrated', 'Comfortable Italian across social and travel contexts'] },
          { header: 'Communication & Leadership:', goals: ['Speak at TED main stage or equivalent global platform', 'Published author — book on AI-driven business transformation', 'Recognized as transformational leader; C-suite with board experience', 'Expert-level negotiator — government and cross-sector deals'] },
          { header: 'Bucket List Growth Experiences:', goals: ['Attend World Economic Forum at Davos', 'Complete a silent retreat or leadership immersive (annual)', 'Speak at a major global conference — sharing the AI transformation story'] },
          { header: 'Personal Growth:', goals: ['Fully integrated — professional excellence and personal wholeness aligned', 'Work-life integration mastered — present as father, husband, and leader', 'Trusting team, faith, and process — released need to control everything'] },
        ],
      },
      '60': {
        label: '20 YEARS (Age 60)',
        categories: [
          { header: 'Credentials & Legacy:', goals: ['Recognized thought leader with full credential stack', 'Mentoring the next generation of executives and leaders', 'Pilgrimage to the Holy Land / Jerusalem — the journey of a lifetime', 'Intellectual legacy — curating reading lists and ideas for others'] },
          { header: 'Communication & Influence:', goals: ['Known as a world-class communicator — regular global keynote speaker', 'Speaking fees $50–100K+ per appearance', 'Multi-book author; possible second book on leadership or public service', 'Household name in business, AI, and political circles'] },
          { header: 'Languages:', goals: ['Bilingual — Spanish fully integrated into daily life', 'Working Italian proficiency — speaking it at the family compound in Italy'] },
          { header: 'Personal Growth:', goals: ['At peace — wisdom earned from a full life; giving it back freely', 'Multi-organization legacy; shaping leadership in business and public life', 'A man who grew into everything he set out to become — and more'] },
        ],
      },
    },
  },
  {
    id: 'spiritual',
    name: 'Spiritual',
    colorHex: '#4361EE',
    timeframes: {
      '40': {
        label: '1 YEAR (Age 40)',
        categories: [
          { header: 'Church & Community:', goals: ['Find a Catholic parish in Dallas — attend regularly', 'Begin introducing myself to the community; get connected', 'Volunteer in one area of ministry'] },
          { header: 'Daily Practice:', goals: ['Establish consistent daily prayer and morning devotional habit', 'Regular Mass attendance — weekly commitment', 'Meditation and quiet reflection — creating space to listen, not just speak'] },
          { header: 'Faith & Giving:', goals: ['Begin consistent tithing — establish a giving habit tied to faith'] },
          { header: 'Spiritual Milestones:', goals: ['First annual spiritual retreat or renewal weekend — away from screens and noise', 'Time to sit with God, review the year, and return to who I am meant to be'] },
        ],
      },
      '45': {
        label: '5 YEARS (Age 45)',
        categories: [
          { header: 'Church & Community:', goals: ['Active, committed parish member — known by name, part of the community fabric', 'Serving in ministry consistently', 'Connected with a faith-based community beyond Sunday'] },
          { header: 'Faith in Family Life:', goals: ['Raising children with Catholic faith as a foundation', 'Family Mass attendance as a non-negotiable tradition', 'Very strong marriage rooted in shared faith — praying together', 'Faith guiding every major decision — career, family, finances'] },
          { header: 'Faith & Giving:', goals: ['Identify and begin funding a Catholic school or parish initiative', 'Faith-based giving a meaningful percentage of income'] },
          { header: 'Spiritual Milestones:', goals: ['Camino de Santiago — walk the historic 500-mile pilgrimage route across Spain', 'Annual spiritual retreat maintained (non-negotiable)', "Known as a leader whose faith-shaped values are visible in how he operates"] },
        ],
      },
      '50': {
        label: '10 YEARS (Age 50)',
        categories: [
          { header: 'Church & Community:', goals: ['Deeply rooted parish member — trusted, possibly in a leadership or stewardship role', 'Visible servant leader in the parish', 'Possibly mentoring younger members of the community'] },
          { header: 'Faith in Family & Leadership:', goals: ["Public about faith as a grounding force in life and leadership", "Kids (ages 5–12) grounded in Catholic faith — attending Catholic school", "Speaking openly about faith's role in my career and decisions"] },
          { header: 'Faith & Giving:', goals: ['Meaningful donor to Catholic education', 'Supporting families who cannot afford Catholic school', 'Active in faith-based philanthropic giving'] },
          { header: 'Spiritual Milestones:', goals: ['Pilgrimage to Rome and the Vatican — walking where Peter walked (Target: Age 47–50)', 'Annual spiritual retreat maintained', 'Spiritual maturity — faith steady under pressure, in success, and in grief'] },
        ],
      },
      '60': {
        label: '20 YEARS (Age 60)',
        categories: [
          { header: 'Church & Legacy:', goals: ['A church community that has shaped me and that I have shaped — legacy of presence', 'Legacy of service; faith expressed through action over decades', 'Patriarch of a faith-filled family — the through-line of everything built'] },
          { header: 'Faith in Leadership & Life:', goals: ['A legacy of servant leadership rooted in faith', 'Known as a man of deep, quiet, tested faith — the kind that endures everything', 'Faith the answer to why I did everything I did'] },
          { header: 'Faith & Giving:', goals: ['Legacy gift — funding a scholarship, a building, or a program in the family\'s name', 'Possible endowed scholarship at a Catholic institution', '$500K–$1M+ in faith-based philanthropic giving over lifetime'] },
          { header: 'Spiritual Milestones:', goals: ['Pilgrimage to the Holy Land & Jerusalem — the journey of a lifetime (Target: Age 50–55)', 'Walking where Jesus walked — Sea of Galilee, Gethsemane, Via Dolorosa', 'A man at peace — wisdom from a full life, faith intact, legacy secure'] },
        ],
      },
    },
  },
  {
    id: 'vision',
    name: 'Vision Board',
    colorHex: '#C9A84C',
    isVision: true,
  },
]

// ── HELPERS ───────────────────────────────────────────────────
export function goalKey(sectionId: string, timeframe: string, catIdx: number, goalIdx: number) {
  return `${sectionId}-${timeframe}-${catIdx}-${goalIdx}`
}

export function funGoalKey(type: string, subIdx: number, goalIdx: number) {
  return `fun-${type}-${subIdx}-${goalIdx}`
}

export function countSectionGoals(section: Section): { total: number } {
  let total = 0
  if (section.isVision) return { total: 0 }
  if (section.timeframes) {
    for (const tf of Object.values(section.timeframes)) {
      tf.categories.forEach(cat => { total += cat.goals.length })
    }
  }
  if (section.pinned) {
    section.pinned.forEach(p => { total += p.goals.length })
  }
  if (section.allAges) {
    section.allAges.forEach(aa => {
      if (aa.goals) total += aa.goals.length
      if (aa.subcategories) aa.subcategories.forEach(sub => { total += sub.goals.length })
    })
  }
  return { total }
}
