import { useCallback, useState } from 'react';
import { Language } from '../../types';
import { CaseStatus } from '../../types/database';
import { speakNaturalMaleVoice, stopNaturalVoice } from '../../lib/audioVoice';
import { LEGAL_CITATIONS } from '../../lib/legalCitations';

export interface ChatMessage {
  id: string;
  sender_type: 'user' | 'ai';
  content: string;
  message_type?: 'text' | 'voice' | 'document_reference';
  created_at?: string;
  attachedFile?: string;
  attachedFileUrl?: string;
  isError?: boolean;
  originalText?: string;
  originalFile?: File | null;
}

export const langToPreferred = (lang: Language): string => {
  switch (lang) {
    case 'hi': return 'hindi';
    case 'en': return 'english';
    case 'hinglish': return 'hinglish';
    case 'ta': return 'tamil';
    case 'te': return 'telugu';
    case 'mr': return 'marathi';
    case 'bn': return 'bengali';
    case 'kn': return 'kannada';
    case 'gu': return 'gujarati';
    case 'ml': return 'malayalam';
    case 'pa': return 'punjabi';
    case 'or': return 'odia';
    case 'ur': return 'urdu';
    default: return 'hindi';
  }
};

const CITATION_ACT_CODES = (() => {
  const shorts = Array.from(
    new Set(LEGAL_CITATIONS.map((c) => c.actShort).filter(Boolean))
  ).sort((a, b) => b.length - a.length);
  return shorts.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
})();

export const extractCitations = (text: string): string[] => {
  const results: string[] = [];
  const patterns: RegExp[] = [
    new RegExp(`\\b(?:${CITATION_ACT_CODES})\\s*-?\\s*(\\d{1,4}[A-Z]?)\\b`, 'gi'),
    /\b(?:Section|Sec)\s+(\d{1,4}[A-Z]?)\s+of\s+(?:the\s+)?((?:[A-Za-z][A-Za-z .&'-]*\s+)?Act)\b/gi,
    /\b(?:Section|Sec)\s+(\d{1,4}[A-Z]?)\s+((?:[A-Za-z][A-Za-z .&'-]*\s+)?Act)\b/gi,
  ];
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((m = re.exec(text)) !== null) {
      const hit = m[0].trim();
      const display = hit.length > 42 ? hit.slice(0, 42) + '…' : hit;
      if (!results.includes(display)) results.push(display);
      if (results.length >= 6) return results;
    }
  }
  return results;
};

export const getWelcomeGreeting = (lang: Language) => {
  if (lang === 'hi') {
    return 'नमस्ते! मैं आपकी Mera Wakeel AI लीगल एडवाइजर (Advocate Naya) हूं। अपनी कानूनी समस्या (प्रॉपर्टी, किराया विवाद, कंज्यूमर शिकायत या नोटिस) विस्तार से बताएं। मैं आपको सही कानूनी रास्ता समझाऊंगी।';
  } else if (lang === 'en') {
    return 'Namaste! I am Advocate Naya, your Mera Wakeel AI Legal Assistant. Please describe your legal issue (property, tenant, consumer complaint, or notice) in detail, and I will guide you with actionable next steps.';
  } else if (lang === 'mr') {
    return 'नमस्कार! मी Mera Wakeel AI कायदेशीर सहाय्यक (Advocate Naya) आहे. तुमचा कायदेशीर प्रश्न (मालमत्ता, भाडेकरू, ग्राहक तक्रार किंवा नोटीस) विस्ताराने सांगा, मी तुम्हाला योग्य मार्ग दर्शवेन.';
  } else if (lang === 'bn') {
    return 'নমস্কার! আমি Mera Wakeel AI আইনি সহায়িকা (Advocate Naya)। আপনার আইনি সমস্যা (সম্পত্তি, ভাড়াটে, ভোক্তা অভিযোগ বা নোটিশ) বিস্তারিত বলুন, আমি আপনাকে সঠিক পথ দেখাবো।';
  } else if (lang === 'ta') {
    return 'வணக்கம்! நான் Mera Wakeel AI சட்ட உதவியாளர் (Advocate Naya). உங்கள் சட்ட பிரச்சனையை (சொத்து, வாடகை, நுகர்வோர் புகார் அல்லது அறிவிப்பு) விரிவாக விவரியுங்கள், நான் சரியான வழிகாட்டுதலை வழங்குவேன்.';
  } else if (lang === 'te') {
    return 'నమస్కారం! నేను Mera Wakeel AI చట్టపరమైన సహాయకురాలు (Advocate Naya). మీ చట్టపరమైన సమస్యను (ఆస్తి, అద్దె, వినియోగదారు ఫిర్యాదు లేదా నోటీసు) వివరంగా వివరించండి, నేను సరైన మార్గదర్శన అందిస్తాను.';
  } else if (lang === 'kn') {
    return 'ನಮಸ್ಕಾರ! ನಾನು Mera Wakeel AI ಕಾನೂನು ಸಹಾಯಕಿ (Advocate Naya). ನಿಮ್ಮ ಕಾನೂನು ಸಮಸ್ಯೆಯನ್ನು (ಆಸ್ತಿ, ಬಾಡಿಗೆ, ಗ್ರಾಹಕ ದೂರು ಅಥವಾ ನೋಟಿಸ್) ವಿವರವಾಗಿ ವಿವರಿಸಿ, ನಾನು ಸರಿಯಾದ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತೇನೆ.';
  } else if (lang === 'gu') {
    return 'નમસ્તે! હું Mera Wakeel AI કાનૂની સહાયક (Advocate Naya) છું. તમારી કાનૂની સમસ્યા (મિલકત, ભાડું, ગ્રાહક ફરિયાદ અથવા નોટિસ) વિગતવાર જણાવો, હું તમને સાચો માર્ગ બતાવીશ.';
  } else if (lang === 'ml') {
    return 'നമസ്കാരം! ഞാൻ Mera Wakeel AI നിയമ സഹായകയാണ് (Advocate Naya). നിങ്ങളുടെ നിയമ പ്രശ്നം (സ്വത്ത്, വാടക, ഉപഭോക്തൃ പരാതി അല്ലെങ്കിൽ നോട്ടീസ്) വിശദമായി വിവരിക്കുക, ഞാൻ ശരിയായ മാർഗ്ഗനിർദ്ദേശം നൽകാം.';
  } else if (lang === 'pa') {
    return 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ Mera Wakeel AI ਕਾਨੂੰਨੀ ਸਹਾਇਕਾ ਹਾਂ (Advocate Naya). ਆਪਣੀ ਕਾਨੂੰਨੀ ਸਮੱਸਿਆ (ਜਾਇਦਾਦ, ਕਿਰਾਇਆ, ਗਾਹਕ ਸ਼ਿਕਾਇਤ ਜਾਂ ਨੋਟਿਸ) ਵਿਸਤਾਰ ਨਾਲ ਦੱਸੋ, ਮੈਂ ਤੁਹਾਨੂੰ ਸਹੀ ਰਸਤਾ ਦਿਖਾਵਾਂਗੀ।';
  } else if (lang === 'or') {
    return 'ନମସ୍କାର! ମୁଁ Mera Wakeel AI ଆଇନଗତ ସହାୟିକା (Advocate Naya)। ଆପଣଙ୍କ ଆଇନଗତ ସମସ୍ୟା (ସମ୍ପତ୍ତି, ଭାଡ଼ା, ଉପଭୋକ୍ତା ଅଭିଯୋଗ କିମ୍ବା ନୋଟିସ) ବିସ୍ତୃତ ଭାବରେ କୁହନ୍ତୁ, ମୁଁ ଆପଣଙ୍କୁ ସଠିକ୍ ପଥ ଦେଖାଇବି।';
  } else if (lang === 'ur') {
    return 'سلام! میں Mera Wakeel AI قانونی معاون (Advocate Naya) ہوں۔ اپنا قانونی مسئلہ (جائیداد، کرایہ، صارف شکایت یا نوٹس) تفصیل سے بتائیں، میں آپ کو صحیح راستہ دکھاؤں گی۔';
  } else {
    return 'Namaste! Main aapki Mera Wakeel AI Legal Advocate (Naya) hoon. Apni kanooni samasya (property, rental, consumer dispute ya notice) batayein, main aapko sahi rasta samjhaungi.';
  }
};

export const QUICK_CHIPS: Record<Language, string[]> = {
  hi: ['संपत्ति विवाद', 'दस्तावेज़ समझ नहीं आते', 'किराया/डिपॉज़िट विवाद', 'ज़मीन पर कब्ज़ा'],
  en: ['Property Dispute', 'Document Confusion', 'Tenant/Deposit Issue', 'Land Encroachment'],
  hinglish: ['Property Jhagda', 'Documents Nahi Samajh Aate', 'Kiraya/Deposit Vivaad', 'Zameen Par Kabza'],
  ta: ['சொத்து தகராறு', 'ஆவணம் புரியவில்லை', 'வாடகை/வைப்பு பிரச்சனை', 'நிலம் ஆக்கிரமிப்பு'],
  te: ['ఆస్తి వివాదం', 'పత్రం అర్థం కావడం లేదు', 'అద్దె/డిపాజిట్ సమస్య', 'భూమి ఆక్రమణ'],
  mr: ['मालमत्ता वाद', 'कागदपत्र समजत नाहीत', 'भाडे/ठेव वाद', 'जमिनीवर आक्रमण'],
  bn: ['সম্পত্তি বিবাদ', 'নথি বুঝতে পারছি না', 'ভাড়া/জমা বিবাদ', 'জমি দখল'],
  kn: ['ಆಸ್ತಿ ವಿವಾದ', 'ದಾಖಲೆ ಅರ್ಥವಾಗುತ್ತಿಲ್ಲ', 'ಬಾಡಿಗೆ/ಠೇವಣಿ ಸಮಸ್ಯೆ', 'ಜಮೀನು ಆಕ್ರಮಣ'],
  gu: ['મિલકત વિવાદ', 'દસ્તાવેજ સમજાતા નથી', 'ભાડું/ડિપોઝિટ વિવાદ', 'જમીન પર કબજો'],
  ml: ['സ്വത്ത് തർക്കം', 'രേഖ മനസ്സിലാകുന്നില്ല', 'വാടക/ഡെപ്പോസിറ്റ് പ്രശ്നം', 'ഭൂമി കയ്യേറ്റം'],
  pa: ['ਜਾਇਦਾਦ ਝਗੜਾ', 'ਦਸਤਾਵੇਜ਼ ਸਮਝ ਨਹੀਂ ਆਉਂਦੇ', 'ਕਿਰਾਇਆ/ਡਿਪਾਜ਼ਿਟ ਮਸਲਾ', 'ਜ਼ਮੀਨ ਉੱਤੇ ਕਬਜ਼ਾ'],
  or: ['ସମ୍ପତ୍ତି ବିବାଦ', 'ଦଲିଲ ବୁଝିହେଉନାହିଁ', 'ଭାଡ଼ା/ଜମା ସମସ୍ୟା', 'ଜମି ଦଖଲ'],
  ur: ['جائیداد کا مسئلہ', 'دستاویز سمجھ نہیں آ رہی', 'کرایہ/ڈپازٹ کا مسئلہ', 'زمین پر قبضہ'],
};

export const PLACEHOLDERS: Record<Language, string> = {
  hi: 'अपनी समस्या लिखें, या माइक दबाएं...',
  en: 'Type your problem, or tap the mic...',
  hinglish: 'Apni samasya likho, ya mic dabao...',
  ta: 'உங்கள் பிரச்சனையை எழுதுங்கள், அல்லது மைக்கை அழுத்துங்கள்...',
  te: 'మీ సమస్యను టైప్ చేయండి, లేదా మైక్ నొక్కండి...',
  mr: 'तुमची समस्या लिहा, किंवा मायक दाबा...',
  bn: 'আপনার সমস্যা লিখুন, অথবা মাইক চাপুন...',
  kn: 'ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ, ಅಥವಾ ಮೈಕ್ ಒತ್ತಿ...',
  gu: 'તમારી સમસ્યા લખો, અથવા માઇક દબાવો...',
  ml: 'നിങ്ങളുടെ പ്രശ്നം ടൈപ്പ് ചെയ്യുക, അല്ലെങ്കിൽ മൈക്ക് അമർത്തുക...',
  pa: 'ਆਪਣੀ ਸਮੱਸਿਆ ਲਿਖੋ, ਜਾਂ ਮਾਈਕ ਦਬਾਓ...',
  or: 'ଆପଣଙ୍କ ସମସ୍ୟା ଲେଖନ୍ତୁ, କିମ୍ବା ମାଇକ୍ ଚାପୁନ୍ତୁ...',
  ur: 'اپنا مسئلہ لکھیں، یا مائک دبائیں...',
};

export const DISCLAIMERS: Record<Language, string> = {
  hi: 'Ye guidance sirf jaankari ke liye hai, professional legal advice ka replacement nahi.',
  en: 'This guidance is for informational purposes only, not a substitute for professional legal advice.',
  hinglish: 'Ye guidance sirf jaankari ke liye hai, professional legal advice ka replacement nahi.',
  ta: 'இந்த வழிகாட்டுதல் தகவலுக்காக மட்டுமே, தொழில்முறை சட்ட ஆலோசனைக்கு மாற்றாக அல்ல.',
  te: 'ఈ మార్గదర్శకం సమాచారం కోసం మాత్రమే, వృత్తిపరమైన చట్టపరమైన సలహాకు ప్రత్యామ్నాయం కాదు.',
  mr: 'हे मार्गदर्शन फक्त माहितीसाठी आहे, व्यावसायिक कायदेशीर सल्ल्याचा पर्याय नाही.',
  bn: 'এই নির্দেশনা শুধুমাত্র তথ্যের জন্য, পেশাদার আইনি পরামর্শের বিকল্প নয়।',
  kn: 'ಈ ಮಾರ್ಗದರ್ಶನ ಮಾಹಿತಿಗಾಗಿ ಮಾತ್ರ, ವೃತ್ತಿಪರ ಕಾನೂನು ಸಲಹೆಗೆ ಪರ್ಯಾಯವಲ್ಲ.',
  gu: 'આ માર્ગદર્શન માત્ર માહિતી માટે છે, વ્યાવસાયિક કાનૂની સલાહનો વિકલ્પ નથી.',
  ml: 'ഈ മാർഗ്ഗനിർദ്ദേശം വിവരത്തിനു മാത്രമുള്ളതാണ്, പ്രൊഫഷണൽ നിയമ ഉപദേശത്തിന് പകരമല്ല.',
  pa: 'ਇਹ ਮਾਰਗਦਰਸ਼ਨ ਸਿਰਫ਼ ਜਾਣਕਾਰੀ ਲਈ ਹੈ, ਪੇਸ਼ੇਵਰ ਕਾਨੂੰਨੀ ਸਲਾਹ ਦਾ ਬਦਲ ਨਹੀਂ।',
  or: 'ଏହି ମାର୍ଗଦର୍ଶନ କେବଳ ସୂଚନା ପାଇଁ, ପେਸ଼େବର ଆইନଗତ ପରାମର୍ଶର ବିକଳ୍ପ ନୁହେଁ।',
  ur: 'یہ رہنمائی صرف معلومات کے لیے ہے، پیشہ ورانہ قانونی مشورے کا متبادل نہیں۔',
};

export interface ParsedAIResponse {
  cleanedText: string;
  newVerdict: 'user_correct' | 'user_incorrect' | 'needs_more_info';
  summaryNote: string;
  docValidity: 'valid' | 'invalid' | 'suspicious' | null;
  caseStatusUpdate: CaseStatus | null;
}

export const parseAIResponse = (responseText: string, currentVerdict: 'user_correct' | 'user_incorrect' | 'needs_more_info'): ParsedAIResponse => {
  let cleanedText = responseText.replace(/ thinking[\s\S]*?<\/think>/gi, '').trim();

  let newVerdict: 'user_correct' | 'user_incorrect' | 'needs_more_info' = currentVerdict;
  const verdictMatch = cleanedText.match(/\[\[VERDICT:\s*(CORRECT|INCORRECT|PENDING)\]\]/i);
  if (verdictMatch) {
    const vStr = verdictMatch[1].toUpperCase();
    if (vStr === 'CORRECT') newVerdict = 'user_correct';
    else if (vStr === 'INCORRECT') newVerdict = 'user_incorrect';
    else newVerdict = 'needs_more_info';
  }

  let summaryNote = '';
  const summaryMatch = cleanedText.match(/\[\[SUMMARY:\s*([\s\S]*?)\]\]/i);
  if (summaryMatch) {
    summaryNote = summaryMatch[1].trim();
  }

  let docValidity: 'valid' | 'invalid' | 'suspicious' | null = null;
  const docMatch = cleanedText.match(/\[\[DOC_VALIDITY:\s*(VALID|INVALID|SUSPICIOUS)\]\]/i);
  if (docMatch) {
    const dStr = docMatch[1].toUpperCase();
    if (dStr === 'VALID') docValidity = 'valid';
    else if (dStr === 'INVALID') docValidity = 'invalid';
    else if (dStr === 'SUSPICIOUS') docValidity = 'suspicious';
  }

  let caseStatusUpdate: CaseStatus | null = null;
  const statusMatch2 = cleanedText.match(/\[\[STATUS:\s*([^\]]+)\]\]/i);
  if (statusMatch2) {
    const sStr = statusMatch2[1].toUpperCase().trim();
    if (sStr.includes('RESOLVED') || sStr.includes('CLOSED')) caseStatusUpdate = 'resolved';
    else if (sStr.includes('LAWYER CONNECTED') || sStr === 'LAWYER_CONNECTED') caseStatusUpdate = 'lawyer_connected';
    else if (sStr.includes('LAWYER REFERRAL') || sStr.includes('ESCALATED')) caseStatusUpdate = 'assessed';
    else if (sStr.includes('ASSESSED')) caseStatusUpdate = 'assessed';
    else if (sStr.includes('DOCS') || sStr.includes('DOCUMENT')) caseStatusUpdate = 'docs_verified' as any;
    else if (sStr === 'ONGOING' || sStr.includes('INFORMATION GATHERING') || sStr.includes('UNDER ASSESSMENT')) caseStatusUpdate = 'ongoing';
  }

  cleanedText = cleanedText
    .replace(/\[\[DOC_VALIDITY:\s*(VALID|INVALID|SUSPICIOUS)\]\]/gi, '')
    .replace(/\[\[VERDICT:\s*(CORRECT|INCORRECT|PENDING)\]\]/gi, '')
    .replace(/\[\[SUMMARY:\s*[\s\S]*?\]\]/gi, '')
    .replace(/\[\[FACT:\s*.*?\s*=\s*.*?\]\]/gi, '')
    .replace(/\[\[STATUS:\s*.*?\]\]/gi, '')
    .replace(/\[\[LAWYER_MATCH:\s*.*?\]\]/gi, '')
    .replace(/\[\[.*?\]\]/gi, '')
    .trim();

  return {
    cleanedText,
    newVerdict,
    summaryNote,
    docValidity,
    caseStatusUpdate,
  };
};

export const fallbackNetworkMessage = (language: Language): string => {
  if (language === 'hi') {
    return 'नमस्ते सर/मैडम, थोड़ा समय दें। नेटवर्क में कुछ धीमापन आ गया है, कृपया एक बार फिर अपना संदेश भेजें।';
  }
  if (language === 'en') {
    return 'Hello Sir/Ma\'am, please give me just a moment. Connection is a bit slow right now, please try sending your message again.';
  }
  if (language === 'mr') {
    return 'नमस्कार सर/मॅडम, थोडा वेळ द्या. नेटवर्कमध्ये थोडी हळूपणा आली आहे, कृपया एकदा पुन्हा संदेश पाठवा.';
  }
  if (language === 'bn') {
    return 'নমস্কার স্যার/ম্যাডাম, একটু সময় দিন। নেটওয়ার্ক একটু ধীর হচ্ছে, অনুগ্রহ করে আবার চেষ্টা করুন।';
  }
  if (language === 'ta') {
    return 'வணக்கம் சார்/மேடம், சிறிது நேரம் கொடுங்கள். நெட்வொர்க் சற்று மெதுவாக உள்ளது, மீண்டும் முயற்சிக்கவும்.';
  }
  if (language === 'te') {
    return 'నమస్కారం సార్/మేడం, కాస్త సమయం ఇవ్వండి. నెట్‌వర్క్ కొంచెం నెమ్మదిగా ఉంది, దయచేసి మళ్ళీ ప్రయత్నించండి.';
  }
  if (language === 'kn') {
    return 'ನಮಸ್ಕಾರ ಸರ್/ಮೇಡಂ, ಸ್ವಲ್ಪ ಸಮಯ ಕೊಡಿ. ನೆಟ್‌ವರ್ಕ್ ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿದೆ, ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.';
  }
  if (language === 'gu') {
    return 'નમસ્તે સર/મેડમ, થોડો સમય આપો. નેટવર્ક થોડો ધીમો છે, કૃપા કરીને ફરી પ્રયાસ કરો.';
  }
  if (language === 'ml') {
    return 'നമസ്കാരം സാർ/മാഡം, കുറച്ച് സമയം തരൂ. നെറ്റ്‌വർക്ക് അല്പം സ്ലോ ആണ്, ദയവായി വീണ്ടും ശ്രമിക്കുക.';
  }
  if (language === 'pa') {
    return 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਸਰ/ਮੈਡਮ, ਥੋੜ੍ਹਾ ਸਮਾਂ ਦਿਓ। ਨੈੱਟਵਰਕ ਹੌਲੀ ਹੈ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਭੇਜੋ।';
  }
  if (language === 'or') {
    return 'ନମସ୍କାର ସାର୍/ମ୍ୟାଡାମ୍, ଟିକେ ସମୟ ଦିଅନ୍ତୁ। ନେଟୱର୍କ ଟିକେ ଧୀର ଅଛି, ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।';
  }
  if (language === 'ur') {
    return 'سلام!/میڈم، تھوڑا وقت دیں۔ نیٹ ورک تھوڑا سست ہے، براہ کرم دوبارہ بھیجنے کی کوشش کریں۔';
  }
  return 'Namaste Sir/Ma\'am, thoda waqt dein. Network thoda slow hai, kripya ek baar fir message bhejein.';
};

export const useSpeechOutput = (language: Language) => {
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const stopSpeechOutput = useCallback(() => {
    stopNaturalVoice();
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(
    (text: string) => {
      if (!voiceOutputEnabled) return;
      stopSpeechOutput();
      speakNaturalMaleVoice(
        text,
        language as 'hi' | 'en' | 'hinglish',
        () => setIsSpeaking(true),
        () => setIsSpeaking(false)
      );
    },
    [voiceOutputEnabled, language, stopSpeechOutput]
  );

  return { voiceOutputEnabled, setVoiceOutputEnabled, isSpeaking, stopSpeechOutput, speakText };
};