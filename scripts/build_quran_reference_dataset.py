import os
import sys
import json
import hashlib
import math
import urllib.request
import xml.etree.ElementTree as ET

# Canonical Bengali names for all 114 Surahs
BANGLA_SURAH_NAMES = [
    "আল-ফাতিহা", "আল-বাকারা", "আলে ইমরান", "আন-নিসা", "আল-মায়িদাহ",
    "আল-আনআম", "আল-আরাফ", "আল-আনফাল", "আত-তাওবাহ", "ইউনুস",
    "হুদ", "ইউসুফ", "আর-রাদ", "ইব্রাহিম", "আল-হিজর",
    "আন-নাহল", "বনী ইসরাঈল (আল-ইসরা)", "আল-কাহফ", "মারইয়াম", "ত্বা-হা",
    "আল-আম্বিয়া", "আল-হজ্জ", "আল-মুমিনুন", "আন-নূর", "আল-ফুরকান",
    "আশ-শুয়ারা", "আন-নামল", "আল-কাসাস", "আল-আনকাবুত", "আর-রূম",
    "লুকমান", "আস-সাজদাহ", "আল-আহযাব", "সাবা", "ফাতির",
    "ইয়াসীন", "আস-সাফফাত", "সোয়াদ", "আজ-জুমার", "আল-মু'মিন (গাফির)",
    "ফুসসিলাত (হা-মীম সাজদাহ)", "আশ-শূরা", "আজ-জু Ruf (আজ-জুখরুফ)", "আদ-দুখান", "আল-জাসিয়াহ",
    "আল-আহকাফ", "মুহাম্মদ", "আল-ফাতহ", "আল-হুজুরাত", "ক্বাফ",
    "আয-যারিয়াত", "আত-তুর", "আন-নাজম", "আল-কামার", "আর-রহমান",
    "আল-ওয়াকিয়াহ", "আল-হাদীদ", "আল-মুজাদালাহ", "আল-হাশর", "আল-মুমতাহানাহ",
    "আস-সাফ", "আল-জুমুআহ", "আল-মুনাফিকুন", "আত-তাগাবুন", "আত-ত্বালাক",
    "আত-তাহরীম", "আল-মুলক", "আল-কলম", "আল-হাক্কাহ", "আল-মাআরিজ",
    "নূহ", "আল-জ্বিন", "আল-মুযযাম্মিল", "আল-মুদ্দাসসির", "আল-কিয়ামাহ",
    "আল-ইনসান (আদ-দাহর)", "আল-মুরসালাত", "আন-নাবা", "আন-নাযিআত", "আবাসা",
    "আত-তাকবীর", "আল-ইনফিতার", "আল-মুতাফফিফীন", "আল-ইনশিকাক", "আল-বুরূজ",
    "আত-তারিক", "আল-আলা", "আল-গাশিয়াহ", "আল-ফজর", "আল-বালাদ",
    "আশ-শামস", "আল-লায়ল", "আদ-দুহা", "আল-ইনশিরাহ (আশ-শারহ)", "আত-তীন",
    "আল-আলাক", "আল-কদর", "আল-বাইয্যিনাহ", "আল-যিলযাল", "আল-আদিয়াত",
    "আল-কারিয়াহ", "আত-তাকাসুর", "আল-আসর", "আল-হুমাযাহ", "আল-ফীল",
    "কুরাইশ", "আল-মাউন", "আল-কাওসার", "আল-কাফিরুন", "আন-নাসর",
    "আল-লাহাব (আল-মাসাদ)", "আল-ইখলাস", "আল-ফালাক", "আন-নাস"
]

def fetch_data():
    print("1. Fetching Tanzil metadata XML...")
    meta_url = "https://tanzil.net/res/text/metadata/quran-data.xml"
    req_meta = urllib.request.Request(meta_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req_meta) as resp:
        xml_bytes = resp.read()
    root = ET.fromstring(xml_bytes)
    print("Tanzil metadata XML parsed successfully.")

    print("2. Fetching Tanzil Uthmani Quran text...")
    text_url = "https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true"
    req_text = urllib.request.Request(text_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req_text) as resp:
        text_lines = resp.read().decode("utf-8").splitlines()
    print(f"Downloaded {len(text_lines)} text lines from Tanzil.")

    return root, text_lines

def build_dataset(root, text_lines):
    # Parse markers helper
    def parse_markers(element_name):
        markers = []
        for item in root.find(element_name):
            markers.append({
                "index": int(item.attrib["index"]),
                "sura": int(item.attrib["sura"]),
                "aya": int(item.attrib["aya"])
            })
        return sorted(markers, key=lambda x: (x["sura"], x["aya"]))

    juz_markers = parse_markers("juzs")
    page_markers = parse_markers("pages")
    hizb_markers = parse_markers("hizbs")       # 240 quarters (rub al-hizb)
    manzil_markers = parse_markers("manzils")
    ruku_markers = parse_markers("rukus")

    def find_marker_index(markers, s, a):
        curr = markers[0]["index"]
        for m in markers:
            if (m["sura"], m["aya"]) <= (s, a):
                curr = m["index"]
            else:
                break
        return curr

    # 1. Build Surahs
    surahs = []
    for s in root.find("suras"):
        idx = int(s.attrib["index"])
        surah_obj = {
            "id": f"surah-{idx}",
            "surahNumber": idx,
            "nameArabic": s.attrib["name"],
            "nameEnglish": s.attrib["ename"],
            "transliteration": s.attrib.get("tname", ""),
            "nameBangla": BANGLA_SURAH_NAMES[idx - 1] if idx <= len(BANGLA_SURAH_NAMES) else "",
            "revelationType": s.attrib.get("type", "Meccan"),
            "revelationOrder": int(s.attrib.get("order", idx)),
            "ayahCount": int(s.attrib["ayas"]),
            "rukuCount": int(s.attrib.get("rukus", 1)),
            "source": "Tanzil Project",
            "sourceVersion": "Uthmani Text v1.1 / Metadata v1.0"
        }
        surahs.append(surah_obj)

    # 2. Parse Verses from Tanzil text
    verses = []
    copyright_lines = []
    for line in text_lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith("#"):
            copyright_lines.append(line)
            continue
        parts = line.split("|")
        if len(parts) == 3:
            s_num = int(parts[0])
            a_num = int(parts[1])
            text_str = parts[2]
            verses.append((s_num, a_num, text_str))

    if len(verses) != 6236:
        raise ValueError(f"Expected exactly 6236 verses, got {len(verses)}")

    # 3. Build Ayahs with complete canonical metadata
    ayahs = []
    for idx, (s_num, a_num, text_str) in enumerate(verses, start=1):
        v_key = f"{s_num}:{a_num}"
        j_num = find_marker_index(juz_markers, s_num, a_num)
        p_num = find_marker_index(page_markers, s_num, a_num)
        rub_num = find_marker_index(hizb_markers, s_num, a_num)
        hizb_num = math.ceil(rub_num / 4)
        manzil_num = find_marker_index(manzil_markers, s_num, a_num)
        ruku_num = find_marker_index(ruku_markers, s_num, a_num)

        ayah_obj = {
            "id": f"ayah-{s_num}-{a_num}",
            "verseKey": v_key,
            "surahNumber": s_num,
            "ayahNumber": a_num,
            "verseIndex": idx,
            "text": text_str,
            "juzNumber": j_num,
            "hizbNumber": hizb_num,
            "rubHizbNumber": rub_num,
            "pageNumber": p_num,
            "manzilNumber": manzil_num,
            "rukuNumber": ruku_num,
            "source": "Tanzil Project",
            "sourceVersion": "Uthmani Text v1.1 / Metadata v1.0"
        }
        ayahs.append(ayah_obj)

    # 4. Build Juzs with first and last verse keys
    juzs = []
    for j in range(1, 31):
        j_ayahs = [a for a in ayahs if a["juzNumber"] == j]
        if not j_ayahs:
            raise ValueError(f"Juz {j} has no ayahs!")
        first_key = j_ayahs[0]["verseKey"]
        last_key = j_ayahs[-1]["verseKey"]
        juzs.append({
            "juzNumber": j,
            "firstAyahKey": first_key,
            "lastAyahKey": last_key,
            "totalAyahs": len(j_ayahs),
            "startSurah": j_ayahs[0]["surahNumber"],
            "startAyah": j_ayahs[0]["ayahNumber"],
            "endSurah": j_ayahs[-1]["surahNumber"],
            "endAyah": j_ayahs[-1]["ayahNumber"],
            "startPage": j_ayahs[0]["pageNumber"],
            "endPage": j_ayahs[-1]["pageNumber"],
            "source": "Tanzil Project",
            "sourceVersion": "Uthmani Text v1.1 / Metadata v1.0"
        })

    # Raw text dump for checksum
    combined_text = "\n".join(f"{a['verseKey']}|{a['text']}" for a in ayahs)
    checksum = hashlib.sha256(combined_text.encode("utf-8")).hexdigest()

    dataset = {
        "metadata": {
            "sourceName": "Tanzil Project",
            "sourceVersion": "Uthmani Text v1.1 / Metadata v1.0",
            "license": "Creative Commons Attribution 3.0",
            "licenseNotice": "\n".join(copyright_lines),
            "attributionUrl": "http://tanzil.net",
            "importDate": "2026-09-30",
            "totalSurahs": len(surahs),
            "totalAyahs": len(ayahs),
            "totalJuz": len(juzs),
            "totalPages": 604,
            "totalHizb": 60,
            "totalRubHizb": 240,
            "totalManzil": 7,
            "totalRukus": 556,
            "sha256Checksum": checksum
        },
        "surahs": surahs,
        "juzs": juzs,
        "ayahs": ayahs
    }

    return dataset

def main():
    root, text_lines = fetch_data()
    dataset = build_dataset(root, text_lines)

    target_path = "data/quran/tanzil_quran_reference.json"
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)

    file_size_mb = os.path.getsize(target_path) / (1024 * 1024)
    print(f"Dataset successfully compiled and written to {target_path} ({file_size_mb:.2f} MB)")
    print(f"Checksum: {dataset['metadata']['sha256Checksum']}")
    print(f"Surahs: {len(dataset['surahs'])}, Juzs: {len(dataset['juzs'])}, Ayahs: {len(dataset['ayahs'])}")

if __name__ == "__main__":
    main()
