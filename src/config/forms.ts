import type { Localized } from '../types'

/**
 * Field definitions mirroring the Ministry paper forms (MSSWLD rev. 10 June 2015):
 * Form A (Client Screening), Form B (Client Intake) and the Sinhala Assessment Form.
 * English and Tamil wording of the Assessment Form is a DRAFT translation pending
 * Ministry verification; Form A/B Sinhala and Tamil wording is likewise draft.
 */

const L = (en: string, si: string, ta: string): Localized => ({ en, si, ta })

export interface Choice {
  value: string
  label: Localized
}

interface FieldBase {
  name: string
  label: Localized
  required?: boolean
  /** Field is shown only when another field has one of these values. */
  showIf?: { field: string; in: string[] }
  /** Name of a free-text field that captures "Other" for this question. */
  otherField?: string
}

export type FieldDef =
  | (FieldBase & { kind: 'text' | 'textarea' | 'date' | 'number' })
  | (FieldBase & { kind: 'radio' | 'checkboxes'; options: Choice[] })

export interface SectionDef {
  id: string
  title: Localized
  fields: FieldDef[]
}

export const OTHER_SPECIFY = L('Other (please specify)', 'වෙනත් (සඳහන් කරන්න)', 'ஏனையவை (குறிப்பிடுக)')

const YES_NO: Choice[] = [
  { value: 'yes', label: L('Yes', 'ඔව්', 'ஆம்') },
  { value: 'no', label: L('No', 'නැත', 'இல்லை') },
]

const NRFA: Choice[] = [
  { value: 'never', label: L('Never', 'කිසිවිටෙක නැත', 'ஒருபோதும் இல்லை') },
  { value: 'rarely', label: L('Rarely', 'කලාතුරකින්', 'அரிதாக') },
  { value: 'frequently', label: L('Frequently', 'නිතර', 'அடிக்கடி') },
  { value: 'always', label: L('Always', 'සැමවිටම', 'எப்போதும்') },
]

const other = (value = 'other'): Choice => ({ value, label: L('Other', 'වෙනත්', 'ஏனையவை') })

/* ------------------------------ Form A ------------------------------ */

export const SCREENING_SECTIONS: SectionDef[] = [
  {
    id: 'header',
    title: L('Session details', 'සැසි විස්තර', 'அமர்வு விவரங்கள்'),
    fields: [
      { kind: 'text', name: 'firstSessionLocation', required: true, label: L('First session location', 'පළමු සැසියේ ස්ථානය', 'முதல் அமர்வு இடம்') },
      { kind: 'date', name: 'firstSessionDate', required: true, label: L('First session date', 'පළමු සැසියේ දිනය', 'முதல் அமர்வு திகதி') },
      { kind: 'text', name: 'counsellorName', required: true, label: L("Counsellor's name", 'උපදේශකගේ නම', 'ஆலோசகரின் பெயர்') },
    ],
  },
  {
    id: 'A',
    title: L("A. Client's demographic information", 'අ. සේවාලාභියාගේ ජන විකාස තොරතුරු', 'அ. வாடிக்கையாளரின் சனத்தொகை விவரங்கள்'),
    fields: [
      {
        kind: 'radio',
        name: 'sex',
        required: true,
        label: L('1. Sex of client', '1. සේවාලාභියාගේ ස්ත්‍රී පුරුෂ භාවය', '1. வாடிக்கையாளரின் பால்'),
        options: [
          { value: 'female', label: L('Female', 'ගැහැණු', 'பெண்') },
          { value: 'male', label: L('Male', 'පිරිමි', 'ஆண்') },
        ],
      },
      { kind: 'number', name: 'age', required: true, label: L("2. Client's age (years)", '2. සේවාලාභියාගේ වයස (අවුරුදු)', '2. வாடிக்கையாளரின் வயது (ஆண்டுகள்)') },
      { kind: 'date', name: 'dateOfBirth', label: L('2a. Date of birth (if known)', '2අ. උපන් දිනය (දන්නේ නම්)', '2அ. பிறந்த திகதி (தெரிந்தால்)') },
      { kind: 'text', name: 'province', required: true, label: L('3. Permanent residence — Province', '3. ස්ථිර පදිංචිය — පළාත', '3. நிரந்தர வதிவிடம் — மாகாணம்') },
      { kind: 'text', name: 'district', required: true, label: L('District', 'දිස්ත්‍රික්කය', 'மாவட்டம்') },
      { kind: 'text', name: 'dsDivision', required: true, label: L('Divisional Secretariat', 'ප්‍රාදේශීය ලේකම් කොට්ඨාසය', 'பிரதேச செயலகப் பிரிவு') },
      { kind: 'text', name: 'gnDivision', label: L('GN division (optional)', 'ග්‍රාම නිලධාරී වසම (අනිවාර්ය නොවේ)', 'கிராம சேவகர் பிரிவு (விருப்பத்தேர்வு)') },
      {
        kind: 'radio',
        name: 'religion',
        otherField: 'religionOther',
        label: L("4. Client's religion", '4. සේවාලාභියාගේ ආගම', '4. வாடிக்கையாளரின் மதம்'),
        options: [
          { value: 'buddhist', label: L('Buddhist', 'බෞද්ධ', 'பௌத்தம்') },
          { value: 'christianRC', label: L('Christian / RC', 'ක්‍රිස්තියානි / කතෝලික', 'கிறிஸ்தவம் / கத்தோலிக்கம்') },
          { value: 'hindu', label: L('Hindu', 'හින්දු', 'இந்து') },
          { value: 'islam', label: L('Islam', 'ඉස්ලාම්', 'இஸ்லாம்') },
          other(),
        ],
      },
      {
        kind: 'radio',
        name: 'ethnicity',
        otherField: 'ethnicityOther',
        label: L("5. Client's ethnicity", '5. සේවාලාභියාගේ ජනවර්ගය', '5. வாடிக்கையாளரின் இனம்'),
        options: [
          { value: 'sinhalese', label: L('Sinhalese', 'සිංහල', 'சிங்களவர்') },
          { value: 'tamil', label: L('Tamil', 'දෙමළ', 'தமிழர்') },
          { value: 'muslim', label: L('Muslim', 'මුස්ලිම්', 'முஸ்லிம்') },
          { value: 'burgher', label: L('Burgher', 'බර්ගර්', 'பறங்கியர்') },
          other(),
        ],
      },
      {
        kind: 'radio',
        name: 'civilStatus',
        otherField: 'civilStatusOther',
        label: L("6. Client's civil status", '6. සේවාලාභියාගේ විවාහක තත්ත්වය', '6. வாடிக்கையாளரின் சிவில் நிலை'),
        options: [
          { value: 'single', label: L('Single', 'අවිවාහක', 'திருமணமாகாதவர்') },
          { value: 'married', label: L('Married', 'විවාහක', 'திருமணமானவர்') },
          { value: 'divorced', label: L('Divorced', 'දික්කසාද', 'விவாகரத்தானவர்') },
          { value: 'widow', label: L('Widow', 'වැන්දඹු', 'விதவை') },
          { value: 'separated', label: L('Separated', 'වෙන්ව සිටින', 'பிரிந்து வாழ்பவர்') },
          other(),
        ],
      },
      {
        kind: 'radio',
        name: 'enoughMoneyForNecessities',
        label: L(
          '7a. Does the client have enough money for basic necessities?',
          '7අ. මූලික අවශ්‍යතා සඳහා සේවාලාභියාට ප්‍රමාණවත් මුදල් තිබේද?',
          '7அ. அடிப்படைத் தேவைகளுக்குப் போதுமான பணம் வாடிக்கையாளரிடம் உள்ளதா?',
        ),
        options: NRFA,
      },
      {
        kind: 'radio',
        name: 'mealsPerDay',
        label: L(
          '7b. On an average day, how many meals does the client eat?',
          '7ආ. සාමාන්‍ය දිනයක සේවාලාභියා ආහාර වේල් කීයක් ගන්නේද?',
          '7ஆ. சாதாரண நாளில் வாடிக்கையாளர் எத்தனை வேளை உணவு உண்கிறார்?',
        ),
        options: [
          { value: 'lessThanOne', label: L('Less than one', 'එකකට අඩු', 'ஒன்றுக்கும் குறைவு') },
          { value: 'one', label: L('One meal', 'වේල් එකයි', 'ஒரு வேளை') },
          { value: 'two', label: L('Two meals', 'වේල් දෙකයි', 'இரண்டு வேளை') },
          { value: 'three', label: L('Three meals', 'වේල් තුනයි', 'மூன்று வேளை') },
        ],
      },
      {
        kind: 'radio',
        name: 'attendsSchool',
        label: L('8a. Does the client currently attend school?', '8අ. සේවාලාභියා දැනට පාසල් යනවාද?', '8அ. வாடிக்கையாளர் தற்போது பாடசாலைக்குச் செல்கிறாரா?'),
        options: YES_NO,
      },
      {
        kind: 'text',
        name: 'currentGrade',
        showIf: { field: 'attendsSchool', in: ['yes'] },
        label: L('8b. If yes, what grade is the client currently in?', '8ආ. ඔව් නම්, දැනට සිටින ශ්‍රේණිය', '8ஆ. ஆம் எனில், தற்போது எந்தத் தரத்தில்?'),
      },
      {
        kind: 'radio',
        name: 'attendedSchoolPast',
        showIf: { field: 'attendsSchool', in: ['no'] },
        label: L('8c. If no, did the client attend school in the past?', '8ඇ. නැත නම්, අතීතයේදී පාසල් ගියාද?', '8இ. இல்லை எனில், கடந்த காலத்தில் பாடசாலை சென்றாரா?'),
        options: YES_NO,
      },
      {
        kind: 'number',
        name: 'yearsOfSchool',
        showIf: { field: 'attendedSchoolPast', in: ['yes'] },
        label: L('8d. How many years of school has the client attended?', '8ඈ. පාසල් ගිය අවුරුදු ගණන', '8ஈ. எத்தனை ஆண்டுகள் பாடசாலை சென்றார்?'),
      },
      {
        kind: 'radio',
        name: 'highestEducation',
        otherField: 'highestEducationOther',
        showIf: { field: 'attendedSchoolPast', in: ['yes'] },
        label: L("8e. Client's highest level of educational achievement", '8ඉ. ඉහළම අධ්‍යාපන මට්ටම', '8உ. உயர்ந்த கல்வித் தகைமை'),
        options: [
          { value: 'upToGrade5', label: L('Up to grade 5', '5 ශ්‍රේණිය දක්වා', 'தரம் 5 வரை') },
          { value: 'grades6to11', label: L('Grades 6–11', '6–11 ශ්‍රේණි', 'தரம் 6–11') },
          { value: 'olPassed', label: L('O/L passed', 'අ.පො.ස. සා.පෙළ සමත්', 'க.பொ.த சா/த சித்தி') },
          { value: 'alPassed', label: L('A/L passed', 'අ.පො.ස. උ.පෙළ සමත්', 'க.பொ.த உ/த சித்தி') },
          { value: 'undergraduate', label: L('Undergraduate (completed)', 'උපාධිය (සම්පූර්ණ)', 'இளநிலைப் பட்டம் (நிறைவு)') },
          { value: 'postgraduate', label: L('Postgraduate (completed)', 'පශ්චාත් උපාධිය (සම්පූර්ණ)', 'முதுநிலைப் பட்டம் (நிறைவு)') },
          other(),
        ],
      },
      {
        kind: 'radio',
        name: 'currentlyWorking',
        label: L('9a. Is the client currently working?', '9අ. සේවාලාභියා දැනට රැකියාවක නියුතුද?', '9அ. வாடிக்கையாளர் தற்போது வேலை செய்கிறாரா?'),
        options: YES_NO,
      },
      {
        kind: 'text',
        name: 'currentJob',
        showIf: { field: 'currentlyWorking', in: ['yes'] },
        label: L('9b. If yes, list the current job', '9ආ. ඔව් නම්, වර්තමාන රැකියාව', '9ஆ. ஆம் எனில், தற்போதைய தொழில்'),
      },
      {
        kind: 'text',
        name: 'notWorkingReason',
        showIf: { field: 'currentlyWorking', in: ['no'] },
        label: L('9c. If no, any reasons given', '9ඇ. නැත නම්, දක්වන ලද හේතු', '9இ. இல்லை எனில், கூறப்பட்ட காரணங்கள்'),
      },
      {
        kind: 'text',
        name: 'primaryOccupation',
        label: L(
          "9d. Client's primary occupation / profession in line with skills or competencies",
          '9ඈ. කුසලතා හෝ හැකියාවලට අනුව සේවාලාභියාගේ ප්‍රධාන වෘත්තිය',
          '9ஈ. திறன்கள் அல்லது தகுதிகளுக்கு ஏற்ற முதன்மைத் தொழில்',
        ),
      },
      {
        kind: 'radio',
        name: 'livingAlone',
        label: L('10. Is the client currently living alone?', '10. සේවාලාභියා දැනට තනිව ජීවත් වේද?', '10. வாடிக்கையாளர் தற்போது தனியாக வசிக்கிறாரா?'),
        options: [
          { value: 'yesWithHouse', label: L('Yes, with a house', 'ඔව්, නිවසක් සහිතව', 'ஆம், வீட்டுடன்') },
          { value: 'yesWithoutHouse', label: L('Yes, without a house', 'ඔව්, නිවසක් නොමැතිව', 'ஆம், வீடு இல்லாமல்') },
          { value: 'noWithHouse', label: L('No, with a house', 'නැත, නිවසක් සහිතව', 'இல்லை, வீட்டுடன்') },
          { value: 'noWithoutHouse', label: L('No, without a house', 'නැත, නිවසක් නොමැතිව', 'இல்லை, வீடு இல்லாமல்') },
        ],
      },
      {
        kind: 'checkboxes',
        name: 'livingWith',
        showIf: { field: 'livingAlone', in: ['noWithHouse', 'noWithoutHouse'] },
        otherField: 'livingWithOthers',
        label: L(
          '10a. If not living alone, who is the client living with? (check all that apply)',
          '10අ. තනිව නොවේ නම්, කවුරුන් සමඟද? (අදාළ සියල්ල)',
          '10அ. தனியாக இல்லையெனில், யாருடன் வசிக்கிறார்? (பொருந்தும் அனைத்தும்)',
        ),
        options: [
          { value: 'mother', label: L('Mother', 'මව', 'தாய்') },
          { value: 'father', label: L('Father', 'පියා', 'தந்தை') },
          { value: 'siblings', label: L('Siblings', 'සහෝදර සහෝදරියන්', 'உடன்பிறப்புகள்') },
          { value: 'children', label: L('Children', 'දරුවන්', 'பிள்ளைகள்') },
          { value: 'friends', label: L('Friends', 'මිතුරන්', 'நண்பர்கள்') },
          { value: 'otherRelatives', label: L('Other relatives', 'වෙනත් ඥාතීන්', 'ஏனைய உறவினர்கள்') },
          { value: 'spouse', label: L('Husband / wife', 'සැමියා / බිරිඳ', 'கணவன் / மனைவி') },
          { value: 'others', label: L('Other(s)', 'වෙනත් අය', 'ஏனையோர்') },
        ],
      },
      {
        kind: 'checkboxes',
        name: 'advisedBy',
        otherField: 'advisedByOther',
        label: L(
          '11. Who advised the client to come for services? (check all that apply)',
          '11. සේවාව සඳහා පැමිණීමට උපදෙස් දුන්නේ කවුද? (අදාළ සියල්ල)',
          '11. சேவைக்கு வர ஆலோசனை வழங்கியவர் யார்? (பொருந்தும் அனைத்தும்)',
        ),
        options: [
          { value: 'ownDecision', label: L('Own decision', 'තමාගේම තීරණය', 'சொந்த முடிவு') },
          { value: 'communityReligious', label: L('Community / religious organisations', 'ප්‍රජා / ආගමික සංවිධාන', 'சமூக / மத அமைப்புகள்') },
          { value: 'familyRelative', label: L('Family / relative', 'පවුල / ඥාතීන්', 'குடும்பம் / உறவினர்') },
          { value: 'health', label: L('Health', 'සෞඛ්‍ය', 'சுகாதாரம்') },
          { value: 'legal', label: L('Legal', 'නීතිමය', 'சட்டம்') },
          { value: 'police', label: L('Police', 'පොලීසිය', 'பொலிஸ்') },
          { value: 'fieldOfficer', label: L('Field officer', 'ක්ෂේත්‍ර නිලධාරී', 'கள உத்தியோகத்தர்') },
          { value: 'education', label: L('Education', 'අධ්‍යාපන', 'கல்வி') },
          other(),
        ],
      },
      {
        kind: 'radio',
        name: 'cameAlone',
        label: L('12. Did the client come alone today?', '12. සේවාලාභියා අද තනිවම පැමිණියාද?', '12. வாடிக்கையாளர் இன்று தனியாக வந்தாரா?'),
        options: YES_NO,
      },
      {
        kind: 'text',
        name: 'cameWith',
        showIf: { field: 'cameAlone', in: ['no'] },
        label: L('12a. If no, who did the client come with?', '12අ. නැත නම්, කවුරුන් සමඟ පැමිණියාද?', '12அ. இல்லை எனில், யாருடன் வந்தார்?'),
      },
    ],
  },
  {
    id: 'B',
    title: L('B. Session summary', 'ආ. සැසි සාරාංශය', 'ஆ. அமர்வுச் சுருக்கம்'),
    fields: [
      {
        kind: 'textarea',
        name: 'presentingProblem',
        required: true,
        label: L("13. Client's presenting problem or concern", '13. සේවාලාභියා ඉදිරිපත් කළ ගැටලුව හෝ කනස්සල්ල', '13. வாடிக்கையாளர் முன்வைத்த பிரச்சினை அல்லது கவலை'),
      },
      {
        kind: 'checkboxes',
        name: 'referredTo',
        otherField: 'referredToOther',
        label: L('14. Client referred to (check all that apply)', '14. සේවාලාභියා යොමු කළ ස්ථාන (අදාළ සියල්ල)', '14. வாடிக்கையாளர் பரிந்துரைக்கப்பட்ட இடம் (பொருந்தும் அனைத்தும்)'),
        options: [
          { value: 'medical', label: L('Medical', 'වෛද්‍ය', 'மருத்துவம்') },
          { value: 'psychiatric', label: L('Psychiatric', 'මනෝ වෛද්‍ය', 'உளநல மருத்துவம்') },
          { value: 'economicFinancial', label: L('Economic / financial', 'ආර්ථික / මූල්‍ය', 'பொருளாதார / நிதி') },
          { value: 'legal', label: L('Legal', 'නීතිමය', 'சட்டம்') },
          { value: 'clinicalPsychology', label: L('Clinical psychology', 'සායනික මනෝවිද්‍යාව', 'மருத்துவ உளவியல்') },
          { value: 'vocational', label: L('Vocational', 'වෘත්තීය', 'தொழில்சார்') },
          { value: 'childServices', label: L('Child services', 'ළමා සේවා', 'சிறுவர் சேவைகள்') },
          { value: 'rehabilitationCentre', label: L('Rehabilitation centre', 'පුනරුත්ථාපන මධ්‍යස්ථානය', 'புனர்வாழ்வு நிலையம்') },
          { value: 'counselling', label: L('Counselling', 'උපදේශනය', 'ஆலோசனை') },
          other(),
        ],
      },
      {
        kind: 'checkboxes',
        name: 'actions',
        otherField: 'actionsOther',
        label: L('15. Actions (check all that apply)', '15. ගත් ක්‍රියාමාර්ග (අදාළ සියල්ල)', '15. மேற்கொண்ட நடவடிக்கைகள் (பொருந்தும் அனைத்தும்)'),
        options: [
          { value: 'madeReferrals', label: L('Made referrals', 'යොමු කිරීම් කළා', 'பரிந்துரைகள் செய்யப்பட்டன') },
          { value: 'providedInformation', label: L('Provided information', 'තොරතුරු ලබා දුන්නා', 'தகவல் வழங்கப்பட்டது') },
          { value: 'psychoEducation', label: L('Provided psycho-education', 'මනෝ අධ්‍යාපනය ලබා දුන්නා', 'உள-கல்வி வழங்கப்பட்டது') },
          { value: 'singleSession', label: L('Single session counselling', 'තනි සැසි උපදේශනය', 'ஒற்றை அமர்வு ஆலோசனை') },
          { value: 'intakeForCounselling', label: L('Intake for counselling', 'උපදේශනය සඳහා ඇතුළත් කිරීම', 'ஆலோசனைக்கான உள்ளீர்ப்பு') },
          other(),
        ],
      },
      { kind: 'textarea', name: 'comments', label: L('16. Any other comments', '16. වෙනත් අදහස්', '16. ஏனைய கருத்துகள்') },
    ],
  },
]

/* ------------------------------ Form B ------------------------------ */

export const INTAKE_SECTIONS: SectionDef[] = [
  {
    id: 'header',
    title: L('Session details', 'සැසි විස්තර', 'அமர்வு விவரங்கள்'),
    fields: [
      { kind: 'text', name: 'sessionLocation', required: true, label: L('Session location', 'සැසි ස්ථානය', 'அமர்வு இடம்') },
      { kind: 'date', name: 'date', required: true, label: L('Date', 'දිනය', 'திகதி') },
      { kind: 'text', name: 'counsellorName', required: true, label: L("Counsellor's name", 'උපදේශකගේ නම', 'ஆலோசகரின் பெயர்') },
    ],
  },
  {
    id: 'C',
    title: L('C. Client interview summary', 'ඇ. සේවාලාභී සම්මුඛ සාකච්ඡා සාරාංශය', 'இ. வாடிக்கையாளர் நேர்காணல் சுருக்கம்'),
    fields: [
      { kind: 'textarea', name: 'presentingProblem', required: true, label: L("1. Client's presenting problem or concern", '1. සේවාලාභියා ඉදිරිපත් කළ ගැටලුව හෝ කනස්සල්ල', '1. வாடிக்கையாளர் முன்வைத்த பிரச்சினை அல்லது கவலை') },
      { kind: 'textarea', name: 'additionalProblems', label: L('2. Additional problems or challenges', '2. අමතර ගැටලු හෝ අභියෝග', '2. மேலதிக பிரச்சினைகள் அல்லது சவால்கள்') },
      { kind: 'textarea', name: 'personalHistory', label: L('3. Personal history', '3. පුද්ගලික ඉතිහාසය', '3. தனிப்பட்ட வரலாறு') },
      { kind: 'textarea', name: 'strengthsAndResources', label: L('4. Personal strengths and resources', '4. පුද්ගලික ශක්තීන් සහ සම්පත්', '4. தனிப்பட்ட பலங்களும் வளங்களும்') },
      { kind: 'textarea', name: 'familyStructure', label: L('5. Family structure and relationships', '5. පවුල් ව්‍යුහය සහ සබඳතා', '5. குடும்பக் கட்டமைப்பும் உறவுகளும்') },
      { kind: 'textarea', name: 'socialSupport', label: L('6. Other social support / community resources', '6. වෙනත් සමාජ සහාය / ප්‍රජා සම්පත්', '6. ஏனைய சமூக ஆதரவு / சமூக வளங்கள்') },
      { kind: 'textarea', name: 'barriersToCounselling', label: L('7. Challenges and barriers for counselling', '7. උපදේශනයට ඇති අභියෝග සහ බාධක', '7. ஆலோசனைக்கான சவால்களும் தடைகளும்') },
      {
        kind: 'textarea',
        name: 'clientActions',
        label: L('8. Actions or initiatives made by client in response to problems', '8. ගැටලුවලට ප්‍රතිචාර ලෙස සේවාලාභියා ගත් ක්‍රියාමාර්ග', '8. பிரச்சினைகளுக்குப் பதிலாக வாடிக்கையாளர் எடுத்த நடவடிக்கைகள்'),
      },
    ],
  },
  {
    id: 'D',
    title: L('D. Physical health', 'ඈ. ශාරීරික සෞඛ්‍යය', 'ஈ. உடல் ஆரோக்கியம்'),
    fields: [
      {
        kind: 'radio',
        name: 'overallHealth',
        label: L('9. How would the client rate their overall health?', '9. සේවාලාභියා තම සමස්ත සෞඛ්‍යය අගයන්නේ කෙසේද?', '9. வாடிக்கையாளர் தனது ஒட்டுமொத்த ஆரோக்கியத்தை எவ்வாறு மதிப்பிடுவார்?'),
        options: [
          { value: 'veryPoor', label: L('Very poor', 'ඉතා දුර්වල', 'மிக மோசம்') },
          { value: 'poor', label: L('Poor', 'දුර්වල', 'மோசம்') },
          { value: 'fair', label: L('Fair', 'සාමාන්‍ය', 'பரவாயில்லை') },
          { value: 'good', label: L('Good', 'හොඳ', 'நல்லது') },
          { value: 'veryGood', label: L('Very good', 'ඉතා හොඳ', 'மிக நல்லது') },
        ],
      },
      {
        kind: 'radio',
        name: 'hasMedicalProblems',
        label: L(
          '10a. Does the client have any medical or health problems that cause ongoing discomfort, interfere with daily functioning, or would impact counselling?',
          '10අ. දිගටම අපහසුතා ඇති කරන, දෛනික කටයුතුවලට බාධා කරන හෝ උපදේශනයට බලපාන වෛද්‍ය හෝ සෞඛ්‍ය ගැටලු තිබේද?',
          '10அ. தொடர்ச்சியான அசௌகரியம், அன்றாடச் செயற்பாட்டில் தடை அல்லது ஆலோசனையைப் பாதிக்கும் மருத்துவ / சுகாதாரப் பிரச்சினைகள் உள்ளனவா?',
        ),
        options: YES_NO,
      },
      {
        kind: 'textarea',
        name: 'medicalProblems',
        showIf: { field: 'hasMedicalProblems', in: ['yes'] },
        label: L('10b. If yes, what is (are) the problem(s)?', '10ආ. ඔව් නම්, ගැටලුව / ගැටලු මොනවාද?', '10ஆ. ஆம் எனில், பிரச்சினை(கள்) என்ன?'),
      },
      {
        kind: 'radio',
        name: 'pastSubstanceProblem',
        label: L(
          '11. Has the client ever had a problem with drugs or alcohol in the past?',
          '11. අතීතයේදී මත්ද්‍රව්‍ය හෝ මත්පැන් සම්බන්ධ ගැටලුවක් තිබුණාද?',
          '11. கடந்த காலத்தில் போதைப்பொருள் அல்லது மதுபானம் தொடர்பான பிரச்சினை இருந்ததா?',
        ),
        options: YES_NO,
      },
      {
        kind: 'radio',
        name: 'currentAlcoholProblem',
        label: L('12. Does the client currently have a problem with alcohol?', '12. දැනට මත්පැන් සම්බන්ධ ගැටලුවක් තිබේද?', '12. தற்போது மதுபானம் தொடர்பான பிரச்சினை உள்ளதா?'),
        options: NRFA,
      },
      {
        kind: 'radio',
        name: 'currentDrugProblem',
        label: L('13. Does the client currently have a problem with drugs?', '13. දැනට මත්ද්‍රව්‍ය සම්බන්ධ ගැටලුවක් තිබේද?', '13. தற்போது போதைப்பொருள் தொடர்பான பிரச்சினை உள்ளதா?'),
        options: NRFA,
      },
    ],
  },
]

export interface ScaleItem {
  id: string
  label: Localized
}

export const PROBLEM_SCALE_OPTIONS: Choice[] = [
  { value: 'notAtAll', label: L('Not at all', 'කොහෙත්ම නැත', 'இல்லவே இல்லை') },
  { value: 'rarely', label: L('Rarely', 'කලාතුරකින්', 'அரிதாக') },
  { value: 'sometimes', label: L('Sometimes', 'සමහර විට', 'சில நேரங்களில்') },
  { value: 'often', label: L('Often', 'නිතර', 'அடிக்கடி') },
]

export const RATING_SCALE_TITLE = L('Problem rating scale', 'ගැටලු ඇගයීම් පරිමාණය', 'பிரச்சினை மதிப்பீட்டு அளவுகோல்')

export const EMOTIONAL_TITLE = L('E. Emotional problems', 'ඉ. චිත්තවේගීය ගැටලු', 'உ. உணர்ச்சிப் பிரச்சினைகள்')

export const EMOTIONAL_ITEMS: ScaleItem[] = [
  { id: 'e1', label: L('1. Feeling sad?', '1. දුකක් දැනෙනවාද?', '1. கவலையாக உணர்கிறீர்களா?') },
  { id: 'e2', label: L('2. Feeling hopeless?', '2. බලාපොරොත්තු රහිත බවක් දැනෙනවාද?', '2. நம்பிக்கையற்றதாக உணர்கிறீர்களா?') },
  { id: 'e3', label: L('3. Thought of ending your life?', '3. ජීවිතය නිම කිරීමට සිතුවාද?', '3. உங்கள் வாழ்க்கையை முடித்துக்கொள்ள நினைத்தீர்களா?') },
  { id: 'e4', label: L('4. Feeling anxious?', '4. කාංසාවක් දැනෙනවාද?', '4. பதட்டமாக உணர்கிறீர்களா?') },
  { id: 'e5', label: L('5. Feeling fearful?', '5. බියක් දැනෙනවාද?', '5. பயமாக உணர்கிறீர்களா?') },
  { id: 'e6', label: L('6. Problems sleeping?', '6. නින්දේ ගැටලු තිබේද?', '6. தூக்கப் பிரச்சினைகள் உள்ளனவா?') },
  { id: 'e7', label: L('7. Nightmares?', '7. භයානක සිහින?', '7. கெட்ட கனவுகள்?') },
  { id: 'e8', label: L('8. Feelings of guilt?', '8. වරදකාරී හැඟීම්?', '8. குற்ற உணர்வுகள்?') },
  { id: 'e9', label: L('9. Becoming angry or irritable?', '9. කෝපයට පත්වීම හෝ නොඉවසිලිමත් වීම?', '9. கோபம் அல்லது எரிச்சல் அடைதல்?') },
  { id: 'e10', label: L('10. Difficulty concentrating?', '10. අවධානය යොමු කිරීමේ අපහසුතාව?', '10. கவனம் செலுத்துவதில் சிரமம்?') },
]

export const BEHAVIOURAL_TITLE = L('F. Behavioural functioning problems', 'ඊ. චර්යාත්මක ක්‍රියාකාරීත්ව ගැටලු', 'ஊ. நடத்தைச் செயற்பாட்டுப் பிரச்சினைகள்')

export const BEHAVIOURAL_ITEMS: ScaleItem[] = [
  {
    id: 'f1',
    label: L(
      '1. Difficulty doing domestic work because of your emotional problems?',
      '1. චිත්තවේගීය ගැටලු නිසා ගෙදර වැඩ කිරීමේ අපහසුතාව?',
      '1. உணர்ச்சிப் பிரச்சினைகளால் வீட்டு வேலைகளைச் செய்வதில் சிரமம்?',
    ),
  },
  {
    id: 'f2',
    label: L(
      '2. Difficulty leaving / being in the house because of your emotional problems?',
      '2. චිත්තවේගීය ගැටලු නිසා නිවසින් පිටවීමේ / නිවසේ සිටීමේ අපහසුතාව?',
      '2. உணர்ச்சிப் பிரச்சினைகளால் வீட்டை விட்டு வெளியேறுவதில் / வீட்டில் இருப்பதில் சிரமம்?',
    ),
  },
  {
    id: 'f3',
    label: L(
      '3. Difficulty engaging in income generation activities because of your emotional problems?',
      '3. චිත්තවේගීය ගැටලු නිසා ආදායම් උපයන කටයුතුවල නිරත වීමේ අපහසුතාව?',
      '3. உணர்ச்சிப் பிரச்சினைகளால் வருமானம் ஈட்டும் செயற்பாடுகளில் ஈடுபடுவதில் சிரமம்?',
    ),
  },
  {
    id: 'f4',
    label: L(
      '4. Difficulty engaging in religious or spiritual activities because of your emotional problems?',
      '4. චිත්තවේගීය ගැටලු නිසා ආගමික හෝ ආධ්‍යාත්මික කටයුතුවල නිරත වීමේ අපහසුතාව?',
      '4. உணர்ச்சிப் பிரச்சினைகளால் மத அல்லது ஆன்மீகச் செயற்பாடுகளில் ஈடுபடுவதில் சிரமம்?',
    ),
  },
  {
    id: 'f5',
    label: L(
      '5. Difficulty doing things for pleasure or fun because of your emotional problems?',
      '5. චිත්තවේගීය ගැටලු නිසා සතුට හෝ විනෝදය සඳහා දේවල් කිරීමේ අපහසුතාව?',
      '5. உணர்ச்சிப் பிரச்சினைகளால் மகிழ்ச்சிக்காக விடயங்களைச் செய்வதில் சிரமம்?',
    ),
  },
  {
    id: 'f6',
    label: L(
      '6. Difficulty visiting friends or relatives because of your emotional problems?',
      '6. චිත්තවේගීය ගැටලු නිසා මිතුරන් හෝ ඥාතීන් බැලීමට යාමේ අපහසුතාව?',
      '6. உணர்ச்சிப் பிரச்சினைகளால் நண்பர்கள் அல்லது உறவினர்களைச் சந்திப்பதில் சிரமம்?',
    ),
  },
]

/* --------------------------- Assessment Form --------------------------- */

export const ASSESSMENT_FORM_TITLE = L('Assessment Form', 'තක්සේරු කිරීමේ පෝරමය', 'மதிப்பீட்டுப் படிவம்')

export const ASSESSMENT_DRAFT_NOTE = L(
  'English and Tamil wording is a draft translation of the Sinhala form, pending Ministry verification.',
  'ඉංග්‍රීසි සහ දෙමළ පාඨ සිංහල පෝරමයේ කෙටුම්පත් පරිවර්තනයකි; අමාත්‍යාංශ තහවුරු කිරීම අපේක්ෂිතයි.',
  'ஆங்கில மற்றும் தமிழ் சொற்கள் சிங்களப் படிவத்தின் வரைவு மொழிபெயர்ப்பு; அமைச்சின் உறுதிப்படுத்தல் நிலுவையில் உள்ளது.',
)

export const SUBSTANCE_SECTION = {
  title: L('Section ඈ — Substance use', '"ඈ" කොටස — මත්ද්‍රව්‍ය භාවිතය', '"ஈ" பகுதி — போதைப்பொருள் பாவனை'),
  items: [
    {
      id: 'a1',
      label: L('1. How many times a day do you use drugs / alcohol?', '1. ඔබ දිනකට කොපමණ වතාවක් මත් ද්‍රව්‍ය / දියර භාවිතා කරන්නේද?', '1. நாளொன்றுக்கு எத்தனை முறை போதைப்பொருள் / மதுபானம் பயன்படுத்துகிறீர்கள்?'),
    },
    {
      id: 'a2',
      label: L('2. What is the most times in a day you use drugs / alcohol?', '2. දිනකට උපරිම කී වතාවක් මත් ද්‍රව්‍ය / දියර භාවිතා කරන්නේද?', '2. நாளொன்றுக்கு அதிகபட்சம் எத்தனை முறை பயன்படுத்துகிறீர்கள்?'),
    },
    {
      id: 'a3',
      label: L('3. At what time of day do you start using?', '3. ඔබ මත් ද්‍රව්‍ය භාවිතය පටන් ගන්නේ දවසේ කොයි වේලාවේද?', '3. நாளின் எந்த நேரத்தில் பயன்படுத்தத் தொடங்குகிறீர்கள்?'),
    },
    {
      id: 'a4',
      label: L('4. Do you use drugs / alcohol alone or with others?', '4. මත් ද්‍රව්‍ය / දියර භාවිතා කරන්නේ තනියමද? / තවත් අය සමගද?', '4. தனியாகவா அல்லது மற்றவர்களுடனா பயன்படுத்துகிறீர்கள்?'),
    },
    {
      id: 'a5',
      label: L('5. In addition, what other substances do you use?', '5. මෙයට අමතරව, ඔබ භාවිතා කරන වෙනත් මත් කාරක මොනවාද?', '5. இதைத் தவிர, வேறு எந்தப் போதைப்பொருட்களைப் பயன்படுத்துகிறீர்கள்?'),
    },
    {
      id: 'a6',
      label: L('6. Have any problems arisen for you because of drug / alcohol use?', '6. මත් ද්‍රව්‍ය / දියර භාවිතය නිසා ඔබට මොනයම් හෝ ගැටළු මතු වුනාද?', '6. போதைப்பொருள் / மதுபானப் பாவனையால் உங்களுக்கு ஏதேனும் பிரச்சினைகள் ஏற்பட்டனவா?'),
    },
    { id: 'a7', label: L('7. If the answer is "yes", describe them', '7. පිළිතුර "ඔව්" නම්, ඒවා විස්තර කරන්න', '7. பதில் "ஆம்" எனில், அவற்றை விபரிக்கவும்'), long: true },
    {
      id: 'a8',
      label: L('8. Have you thought about stopping drug / alcohol use?', '8. මත් ද්‍රව්‍ය / දියර භාවිතය නතර කිරීමට ඔබ සිතා තිබේද?', '8. போதைப்பொருள் / மதுபானப் பாவனையை நிறுத்த நினைத்திருக்கிறீர்களா?'),
    },
    { id: 'a8i', label: L('i) How many times?', 'i) කී වාරයක් ද?', 'i) எத்தனை முறை?'), sub: true },
    { id: 'a8ii', label: L('ii) For how long did you stop?', 'ii) කොපමණ කාලයක් නවත්වා සිට ඇත්ද?', 'ii) எவ்வளவு காலம் நிறுத்தியிருந்தீர்கள்?'), sub: true },
    {
      id: 'a8iii',
      label: L('iii) If the attempt failed, the reason', 'iii) උත්සාහය අසාර්ථක වී නම්, එයට බලපෑ හේතුව', 'iii) முயற்சி தோல்வியடைந்திருந்தால், அதற்கான காரணம்'),
      sub: true,
    },
    {
      id: 'a9',
      label: L(
        '9. Do you get angry when others talk about your drug / alcohol use?',
        '9. ඔබේ මත් ද්‍රව්‍ය / දියර භාවිතය ගැන අන් අය කතා කරන විට ඔබ කෝපයට පත් වන්නේද?',
        '9. உங்கள் பாவனை பற்றி மற்றவர்கள் பேசும்போது கோபப்படுகிறீர்களா?',
      ),
      long: true,
    },
    {
      id: 'a10',
      label: L(
        '10. When using drugs / alcohol, do you think you are doing something wrong?',
        '10. මත් ද්‍රව්‍ය / දියර භාවිතා කරන විට, ඔබ වරදක් කරනවා කියලා හිතනවා ද?',
        '10. பயன்படுத்தும்போது, நீங்கள் தவறு செய்வதாக நினைக்கிறீர்களா?',
      ),
    },
    { id: 'a11', label: L('11. Why do you think so?', '11. ඔබ එසේ සිතන්නේ ඇයි?', '11. நீங்கள் ஏன் அவ்வாறு நினைக்கிறீர்கள்?'), long: true },
  ] as Array<ScaleItem & { long?: boolean; sub?: boolean }>,
}

export const SYMPTOM_SECTION = {
  title: L('Section ඉ — Symptom frequency', '"ඉ" කොටස — රෝග ලක්ෂණ', '"உ" பகுதி — அறிகுறிகளின் அதிர்வெண்'),
  options: [
    { value: 'notAtAll', label: L('Not at all', 'කොහෙත්ම නැත', 'இல்லவே இல்லை') },
    { value: 'rarely', label: L('Rarely', 'කලාතුරකින්', 'அரிதாக') },
    { value: 'sometimes', label: L('Sometimes', 'සමහර විට', 'சில நேரங்களில்') },
    { value: 'always', label: L('Always', 'නිතරම', 'எப்போதும்') },
  ] as Choice[],
  items: [
    { id: 's1', label: L('1. Do you feel sad?', '1. ඔබට දුකක් දැනෙනවද?', '1. உங்களுக்குக் கவலையாக இருக்கிறதா?') },
    { id: 's2', label: L('2. Do you feel hopeless?', '2. බලාපොරොත්තු රහිත බවක් දැනෙනවද?', '2. நம்பிக்கையற்றதாக உணர்கிறீர்களா?') },
    { id: 's3', label: L('3. Do you feel anxious?', '3. කාන්සාවක් දැනෙනවද?', '3. பதட்டமாக உணர்கிறீர்களா?') },
    { id: 's4', label: L('4. Do you feel guilty?', '4. වරදකාරී හැඟීමක් දැනෙනවද?', '4. குற்ற உணர்வு ஏற்படுகிறதா?') },
    { id: 's5', label: L('5. Getting angry quickly / irritability', '5. ඉක්මනින් කෝපයට පත්වීම / නොරිස්සුම්බව', '5. விரைவில் கோபமடைதல் / எரிச்சல்') },
    { id: 's6', label: L('6. Agitated or racing thoughts', '6. සිතිවිලි වල කලබලකාරී බව', '6. குழப்பமான எண்ணங்கள்') },
    {
      id: 's7',
      label: L('7. Difficulty keeping your mind on one thing', '7. එක් අරමුණක හිත පවත්වා ගැනීමේ අපහසුතාව', '7. ஒரு விடயத்தில் மனதை ஒருமுகப்படுத்துவதில் சிரமம்'),
    },
    {
      id: 's8',
      label: L('8. Do you feel suspicion or mistrust of others?', '8. අන් අය ගැන සැකය / අවිශ්වාසය පවතිනවාද?', '8. மற்றவர்கள் மீது சந்தேகம் / அவநம்பிக்கை உள்ளதா?'),
    },
    { id: 's9', label: L('9. Do you have difficulty sleeping?', '9. නින්ද යාමේ අපහසුතා පවතීද?', '9. தூங்குவதில் சிரமம் உள்ளதா?') },
    { id: 's10', label: L('10. Do you have nightmares?', '10. භයානක සිහින දකිනවාද?', '10. பயங்கரமான கனவுகள் காண்கிறீர்களா?') },
  ] as ScaleItem[],
}

export const FUNCTIONING_SECTION = {
  title: L('Section ඊ — Daily functioning', '"ඊ" කොටස — දෛනික ක්‍රියාකාරීත්වය', '"ஊ" பகுதி — அன்றாடச் செயற்பாடு'),
  items: [
    {
      id: 'q11',
      label: L('11. Do you have difficulty carrying out household tasks?', '11. ගෙදර දොර කටයුතු කර ගෙන යාමේ අපහසුතා තිබේද?', '11. வீட்டு வேலைகளைச் செய்வதில் சிரமம் உள்ளதா?'),
    },
    { id: 'q12', label: L('12. Do you have difficulty carrying out work?', '12. රැකියා කටයුතු කර ගෙන යාමේ අපහසුතා තිබේද?', '12. வேலை செய்வதில் சிரமம் உள்ளதா?') },
    {
      id: 'q13',
      label: L('13. Do you have difficulty dealing with people at home?', '13. නිවසේ අය සමඟ ගනු දෙනු කිරීමේ අපහසුතා තිබේද?', '13. வீட்டில் உள்ளவர்களுடன் பழகுவதில் சிரமம் உள்ளதா?'),
    },
    {
      id: 'q14',
      label: L('14. Do you have difficulty taking part in leisure activities?', '14. විනෝද කටයුතු වල නිරත වීමේ අපහසුතා තිබේද?', '14. பொழுதுபோக்குச் செயற்பாடுகளில் ஈடுபடுவதில் சிரமம் உள்ளதா?'),
    },
    {
      id: 'q15',
      label: L(
        '15. Do you have difficulty spending time with relatives and friends?',
        '15. නෑදෑ හිත මිතුරන් සමඟ කාලය ගත කිරීමේ අපහසුතා තිබේද?',
        '15. உறவினர்கள், நண்பர்களுடன் நேரம் செலவிடுவதில் சிரமம் உள்ளதா?',
      ),
    },
  ] as ScaleItem[],
}

export const YES_NO_CHOICES = YES_NO
