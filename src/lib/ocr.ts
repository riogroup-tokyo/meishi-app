import Tesseract from 'tesseract.js';

export interface OcrResult {
  company_name: string | null;
  department: string | null;
  position: string | null;
  person_name: string | null;
  person_name_kana: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  fax: string | null;
  postal_code: string | null;
  address: string | null;
  website: string | null;
  raw_text: string;
}

/**
 * Main function: takes an image file, runs OCR with Japanese + English,
 * and parses the result into structured business card data.
 */
export async function recognizeBusinessCard(imageFile: File): Promise<OcrResult> {
  const { data } = await Tesseract.recognize(imageFile, 'jpn+eng', {
    logger: (info) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[OCR]', info.status, Math.round((info.progress ?? 0) * 100) + '%');
      }
    },
  });

  const rawText = data.text.trim();
  const parsed = parseBusinessCardText(rawText);

  return {
    ...parsed,
    raw_text: rawText,
  };
}

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

// Japanese phone numbers: 0X-XXXX-XXXX / 0X0-XXXX-XXXX / (0X) XXXX-XXXX etc.
const PHONE_RE =
  /(?:\(?\d{2,4}\)?[\s\-.]?\d{2,4}[\s\-.]?\d{3,4})/;

// Mobile prefixes (070 / 080 / 090)
const MOBILE_PREFIX_RE = /^0[789]0/;

// FAX is identified by the label preceding the number
const FAX_LABEL_RE = /(?:FAX|fax|Fax|ファクス|ファックス|F)/i;

// Postal code: 〒XXX-XXXX or just XXX-XXXX at line start
const POSTAL_RE = /〒?\s*(\d{3}[\-ー]\d{4})/;

// Website
const URL_RE = /https?:\/\/[^\s]+|www\.[^\s]+/i;

// Company suffixes / prefixes
const COMPANY_RE =
  /株式会社|（株）|\(株\)|有限会社|（有）|\(有\)|合同会社|合資会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|特定非営利活動法人|NPO法人|社会福祉法人|医療法人|学校法人|Co\.,?\s*Ltd\.?|Inc\.?|Corp\.?|Corporation|LLC|LLP|Ltd\.?|K\.K\.|G\.K\./i;

// Department keywords
const DEPARTMENT_RE =
  /部$|課$|室$|センター$|グループ$|チーム$|本部$|事業部$|支店$|支社$|営業所$|研究所$|局$|セクション$|ユニット$|ディビジョン$/;

// Position / title keywords
const POSITION_RE =
  /代表取締役|取締役|監査役|執行役員|相談役|顧問|社長|副社長|専務|常務|会長|副会長|部長|副部長|次長|課長|係長|主任|主査|主幹|参事|技師|マネージャー|マネジャー|リーダー|ディレクター|プロデューサー|エンジニア|アーキテクト|コンサルタント|アドバイザー|スペシャリスト|アナリスト|プランナー|デザイナー|CEO|CTO|CFO|COO|CIO|CMO|CPO|VP|SVP|EVP|President|Director|Manager|Senior|Lead|Chief|Officer|General\s*Manager|Professor|Dr\.|Ph\.D/i;

// Prefectures for address detection
const PREFECTURE_RE =
  /東京都|北海道|(?:京都|大阪)府|(?:青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)県/;

// Full-width / half-width katakana block (used for kana name detection)
const KATAKANA_LINE_RE = /^[\u30A0-\u30FF\u31F0-\u31FF\uFF65-\uFF9Fー\s]+$/;
const HIRAGANA_LINE_RE = /^[\u3040-\u309F\u30FC\s]+$/;

// Lines that look like address continuations (city / ward / block / building)
const ADDRESS_CONTINUATION_RE =
  /^\d|^[一二三四五六七八九十百千万]+|区|市|町|村|丁目|番地|番|号|ビル|ビルディング|タワー|マンション|階|F$/;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseBusinessCardText(text: string): Omit<OcrResult, 'raw_text'> {
  const result: Omit<OcrResult, 'raw_text'> = {
    company_name: null,
    department: null,
    position: null,
    person_name: null,
    person_name_kana: null,
    email: null,
    phone: null,
    mobile_phone: null,
    fax: null,
    postal_code: null,
    address: null,
    website: null,
  };

  // Normalise line breaks and split into non-empty lines
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return result;

  // Track which lines have been "consumed" by a field
  const consumed = new Set<number>();

  // ------------------------------------------------------------------
  // 1. Extract clearly identifiable fields first (email, phone, URL,
  //    postal code) because they are regex-friendly.
  // ------------------------------------------------------------------

  const phoneNumbers: { value: string; type: 'phone' | 'mobile' | 'fax'; lineIdx: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Email
    if (!result.email) {
      const emailMatch = line.match(EMAIL_RE);
      if (emailMatch) {
        result.email = emailMatch[0];
        // If the line is *only* the email, consume it
        if (line.replace(EMAIL_RE, '').replace(/[\s:：]/g, '').length < 3) {
          consumed.add(i);
        }
      }
    }

    // Website
    if (!result.website) {
      const urlMatch = line.match(URL_RE);
      if (urlMatch) {
        result.website = urlMatch[0];
        if (line.replace(URL_RE, '').replace(/[\s:：]/g, '').length < 3) {
          consumed.add(i);
        }
      }
    }

    // Postal code
    if (!result.postal_code) {
      const postalMatch = line.match(POSTAL_RE);
      if (postalMatch) {
        result.postal_code = postalMatch[1];
      }
    }

    // Phone numbers (may appear multiple times on different lines)
    const isFaxLine = FAX_LABEL_RE.test(line);
    // Remove labels like TEL / FAX / 電話 before extracting digits
    const cleanedLine = line
      .replace(/(?:TEL|tel|Tel|電話|携帯|mobile|Mobile|FAX|fax|Fax|ファクス|ファックス|直通)[：:\s]*/gi, '')
      .trim();

    const phoneMatch = cleanedLine.match(PHONE_RE);
    if (phoneMatch) {
      const num = phoneMatch[0].replace(/[\s.]/g, '');
      const digitsOnly = num.replace(/[\-()（）]/g, '');

      // Skip if it looks like a postal code we already captured
      if (result.postal_code && digitsOnly.includes(result.postal_code.replace('-', ''))) {
        // skip
      } else if (digitsOnly.length >= 9) {
        let type: 'phone' | 'mobile' | 'fax' = 'phone';
        if (isFaxLine) {
          type = 'fax';
        } else if (MOBILE_PREFIX_RE.test(digitsOnly)) {
          type = 'mobile';
        }
        phoneNumbers.push({ value: num, type, lineIdx: i });
      }
    }
  }

  // Assign phone numbers
  for (const pn of phoneNumbers) {
    if (pn.type === 'fax' && !result.fax) {
      result.fax = pn.value;
      consumed.add(pn.lineIdx);
    } else if (pn.type === 'mobile' && !result.mobile_phone) {
      result.mobile_phone = pn.value;
      consumed.add(pn.lineIdx);
    } else if (pn.type === 'phone' && !result.phone) {
      result.phone = pn.value;
      consumed.add(pn.lineIdx);
    }
  }

  // ------------------------------------------------------------------
  // 2. Address — starts with postal code or prefecture
  // ------------------------------------------------------------------

  const addressParts: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (POSTAL_RE.test(line) || PREFECTURE_RE.test(line)) {
      // Start collecting address from this line
      // Remove the postal mark if present, but keep the rest
      const addrLine = line.replace(/^〒\s*/, '').trim();
      if (addrLine) addressParts.push(addrLine);
      consumed.add(i);

      // Look ahead for continuation lines (building name, floor, etc.)
      for (let j = i + 1; j < lines.length; j++) {
        if (consumed.has(j)) break;
        const nextLine = lines[j];
        // If the next line looks like an address continuation
        if (
          ADDRESS_CONTINUATION_RE.test(nextLine) &&
          !EMAIL_RE.test(nextLine) &&
          !URL_RE.test(nextLine) &&
          !PHONE_RE.test(nextLine.replace(/[A-Za-zァ-ヶ：:]/g, ''))
        ) {
          addressParts.push(nextLine);
          consumed.add(j);
        } else {
          break;
        }
      }
      break; // only capture one address block
    }
  }
  if (addressParts.length > 0) {
    result.address = addressParts.join(' ');
  }

  // ------------------------------------------------------------------
  // 3. Company, department, position, name — from remaining lines
  // ------------------------------------------------------------------

  // Classify each unconsumed line
  interface LineInfo {
    idx: number;
    text: string;
    isCompany: boolean;
    isDepartment: boolean;
    isPosition: boolean;
    isKana: boolean;
    isNameCandidate: boolean;
  }

  const lineInfos: LineInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i)) continue;
    const line = lines[i];

    // Skip lines that are just phone/email/url labels
    if (/^(?:TEL|FAX|携帯|電話|E-?mail|URL|HP|ホームページ|Web)[：:\s]*$/i.test(line)) {
      consumed.add(i);
      continue;
    }

    const isCompany = COMPANY_RE.test(line);
    const isDepartment = DEPARTMENT_RE.test(line);
    const isPosition = POSITION_RE.test(line);
    const isKana = KATAKANA_LINE_RE.test(line) || HIRAGANA_LINE_RE.test(line);

    // A "name candidate" is a short line (2-6 chars for Japanese, up to ~30 for
    // romaji) that doesn't match other patterns.
    const isNameCandidate =
      !isCompany &&
      !isDepartment &&
      !isKana &&
      !EMAIL_RE.test(line) &&
      !URL_RE.test(line) &&
      line.length >= 2 &&
      line.length <= 30;

    lineInfos.push({
      idx: i,
      text: line,
      isCompany,
      isDepartment,
      isPosition,
      isKana,
      isNameCandidate,
    });
  }

  // Company: first line that matches company pattern, or fallback to the very first unconsumed line
  const companyLine = lineInfos.find((l) => l.isCompany);
  if (companyLine) {
    result.company_name = companyLine.text;
    consumed.add(companyLine.idx);
  } else if (lineInfos.length > 0 && !lineInfos[0].isKana && !lineInfos[0].isPosition) {
    // Heuristic: the first line of a Japanese business card is usually the company
    result.company_name = lineInfos[0].text;
    consumed.add(lineInfos[0].idx);
  }

  // Department
  const deptLine = lineInfos.find((l) => !consumed.has(l.idx) && l.isDepartment);
  if (deptLine) {
    result.department = deptLine.text;
    consumed.add(deptLine.idx);
  }

  // Position — may be on the same line as the name (e.g. "部長 田中太郎")
  const posLine = lineInfos.find((l) => !consumed.has(l.idx) && l.isPosition);
  if (posLine) {
    // Check if the line also contains a name (position + name on one line)
    const posMatch = posLine.text.match(POSITION_RE);
    if (posMatch) {
      const posText = posMatch[0];
      const remainder = posLine.text.replace(POSITION_RE, '').replace(/[\s　]+/g, ' ').trim();

      result.position = posText;

      // If there's remaining text that looks like a name
      if (remainder.length >= 2 && remainder.length <= 20 && !result.person_name) {
        result.person_name = remainder;
      }
    } else {
      result.position = posLine.text;
    }
    consumed.add(posLine.idx);
  }

  // Kana (furigana) — often right before or after the name line
  const kanaLine = lineInfos.find((l) => !consumed.has(l.idx) && l.isKana);
  if (kanaLine) {
    result.person_name_kana = kanaLine.text;
    consumed.add(kanaLine.idx);
  }

  // Person name — pick the best remaining candidate
  if (!result.person_name) {
    const nameCandidates = lineInfos.filter(
      (l) =>
        !consumed.has(l.idx) &&
        l.isNameCandidate &&
        !l.isPosition &&
        !l.isDepartment &&
        !l.isCompany
    );

    if (nameCandidates.length > 0) {
      // Prefer a candidate that is near the kana line, or the shortest candidate
      // (names are typically short), or simply the first one.
      let best = nameCandidates[0];

      if (kanaLine) {
        // Pick candidate closest to the kana line
        const closest = nameCandidates.reduce((prev, curr) =>
          Math.abs(curr.idx - kanaLine.idx) < Math.abs(prev.idx - kanaLine.idx) ? curr : prev
        );
        best = closest;
      } else {
        // Pick the candidate that looks most like a Japanese name (2-5 kanji/kana chars)
        const japaneseName = nameCandidates.find(
          (c) => /^[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\s　]+$/.test(c.text) && c.text.replace(/[\s　]/g, '').length <= 8
        );
        if (japaneseName) best = japaneseName;
      }

      result.person_name = best.text;
      consumed.add(best.idx);
    }
  }

  return result;
}
