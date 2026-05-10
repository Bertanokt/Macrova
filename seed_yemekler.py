"""
Çiğ / Pişmiş yemek verilerini Supabase'e ekler.
Mevcut kayıtlarda isim_en eksikse günceller.
Kullanım: python seed_yemekler.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from utils.supabase_client import supabase

YEMEKLER = [
    # ── Tavuk ────────────────────────────────────────────────────────────────
    {"isim": "Tavuk Göğsü (çiğ)",          "isim_en": "Chicken Breast (raw)",          "kalori_100g": 120, "protein_100g": 22.5, "karbonhidrat_100g": 0,   "yag_100g": 2.6,  "kategori": "Et & Tavuk"},
    {"isim": "Tavuk Göğsü (haşlanmış)",    "isim_en": "Chicken Breast (boiled)",       "kalori_100g": 148, "protein_100g": 29.0, "karbonhidrat_100g": 0,   "yag_100g": 3.1,  "kategori": "Et & Tavuk"},
    {"isim": "Tavuk Göğsü (ızgara)",       "isim_en": "Chicken Breast (grilled)",      "kalori_100g": 165, "protein_100g": 31.0, "karbonhidrat_100g": 0,   "yag_100g": 3.6,  "kategori": "Et & Tavuk"},
    {"isim": "Tavuk But (çiğ)",            "isim_en": "Chicken Thigh (raw)",           "kalori_100g": 177, "protein_100g": 18.0, "karbonhidrat_100g": 0,   "yag_100g": 11.5, "kategori": "Et & Tavuk"},
    {"isim": "Tavuk But (haşlanmış)",      "isim_en": "Chicken Thigh (boiled)",        "kalori_100g": 209, "protein_100g": 24.0, "karbonhidrat_100g": 0,   "yag_100g": 12.0, "kategori": "Et & Tavuk"},
    {"isim": "Tavuk But (Haşlanmış)",      "isim_en": "Chicken Thigh (boiled)",        "kalori_100g": 209, "protein_100g": 24.0, "karbonhidrat_100g": 0,   "yag_100g": 12.0, "kategori": "Et & Tavuk"},
    {"isim": "Tavuk But (ızgara)",         "isim_en": "Chicken Thigh (grilled)",       "kalori_100g": 220, "protein_100g": 25.0, "karbonhidrat_100g": 0,   "yag_100g": 13.0, "kategori": "Et & Tavuk"},
    {"isim": "Tavuk But (fırın)",          "isim_en": "Chicken Thigh (baked)",         "kalori_100g": 189, "protein_100g": 25.0, "karbonhidrat_100g": 0,   "yag_100g": 10.0, "kategori": "Et & Tavuk"},
    {"isim": "Tavuk But (Fırında)",        "isim_en": "Chicken Thigh (baked)",         "kalori_100g": 189, "protein_100g": 25.0, "karbonhidrat_100g": 0,   "yag_100g": 10.0, "kategori": "Et & Tavuk"},
    {"isim": "Tavuk Baget",                "isim_en": "Chicken Drumstick",             "kalori_100g": 185, "protein_100g": 22.0, "karbonhidrat_100g": 0,   "yag_100g": 10.0, "kategori": "Et & Tavuk"},
    {"isim": "Tavuk Kanat (çiğ)",          "isim_en": "Chicken Wing (raw)",            "kalori_100g": 203, "protein_100g": 19.0, "karbonhidrat_100g": 0,   "yag_100g": 14.0, "kategori": "Et & Tavuk"},
    {"isim": "Tavuk Döner",                "isim_en": "Chicken Döner",                 "kalori_100g": 200, "protein_100g": 22.0, "karbonhidrat_100g": 3.0, "yag_100g": 11.0, "kategori": "Et & Tavuk"},
    {"isim": "Tavuk Pirzola (ızgara)",     "isim_en": "Chicken Chop (grilled)",        "kalori_100g": 170, "protein_100g": 28.0, "karbonhidrat_100g": 0,   "yag_100g": 6.0,  "kategori": "Et & Tavuk"},

    # ── Dana / Kırmızı Et ─────────────────────────────────────────────────────
    {"isim": "Dana Kıyma (çiğ)",           "isim_en": "Ground Beef (raw)",             "kalori_100g": 215, "protein_100g": 17.0, "karbonhidrat_100g": 0,   "yag_100g": 15.0, "kategori": "Et & Tavuk"},
    {"isim": "Dana Kıyma (pişmiş)",        "isim_en": "Ground Beef (cooked)",          "kalori_100g": 265, "protein_100g": 26.0, "karbonhidrat_100g": 0,   "yag_100g": 18.0, "kategori": "Et & Tavuk"},
    {"isim": "Kuzu Kıyma (çiğ)",           "isim_en": "Ground Lamb (raw)",             "kalori_100g": 235, "protein_100g": 16.0, "karbonhidrat_100g": 0,   "yag_100g": 18.5, "kategori": "Et & Tavuk"},
    {"isim": "Kuzu Kıyma (pişmiş)",        "isim_en": "Ground Lamb (cooked)",          "kalori_100g": 290, "protein_100g": 24.0, "karbonhidrat_100g": 0,   "yag_100g": 21.0, "kategori": "Et & Tavuk"},
    {"isim": "Dana But (çiğ)",             "isim_en": "Beef Leg (raw)",                "kalori_100g": 143, "protein_100g": 21.0, "karbonhidrat_100g": 0,   "yag_100g": 6.0,  "kategori": "Et & Tavuk"},
    {"isim": "Dana But (haşlanmış)",       "isim_en": "Beef Leg (boiled)",             "kalori_100g": 185, "protein_100g": 30.0, "karbonhidrat_100g": 0,   "yag_100g": 7.0,  "kategori": "Et & Tavuk"},
    {"isim": "Dana Biftek (ızgara)",       "isim_en": "Beef Steak (grilled)",          "kalori_100g": 217, "protein_100g": 26.0, "karbonhidrat_100g": 0,   "yag_100g": 12.0, "kategori": "Et & Tavuk"},
    {"isim": "Döner (dana)",               "isim_en": "Beef Döner",                    "kalori_100g": 220, "protein_100g": 20.0, "karbonhidrat_100g": 3.0, "yag_100g": 14.0, "kategori": "Et & Tavuk"},
    {"isim": "Köfte (ızgara)",             "isim_en": "Grilled Meatball",              "kalori_100g": 250, "protein_100g": 22.0, "karbonhidrat_100g": 5.0, "yag_100g": 16.0, "kategori": "Et & Tavuk"},

    # ── Hindi ─────────────────────────────────────────────────────────────────
    {"isim": "Hindi Göğsü (çiğ)",          "isim_en": "Turkey Breast (raw)",           "kalori_100g": 104, "protein_100g": 21.0, "karbonhidrat_100g": 0,   "yag_100g": 1.8,  "kategori": "Et & Tavuk"},
    {"isim": "Hindi Göğsü (haşlanmış)",    "isim_en": "Turkey Breast (boiled)",        "kalori_100g": 135, "protein_100g": 28.0, "karbonhidrat_100g": 0,   "yag_100g": 2.2,  "kategori": "Et & Tavuk"},

    # ── Balık ─────────────────────────────────────────────────────────────────
    {"isim": "Somon (çiğ)",                "isim_en": "Salmon (raw)",                  "kalori_100g": 208, "protein_100g": 20.0, "karbonhidrat_100g": 0,   "yag_100g": 13.0, "kategori": "Balık & Deniz Ürünleri"},
    {"isim": "Somon (fırın)",              "isim_en": "Salmon (baked)",                "kalori_100g": 233, "protein_100g": 25.0, "karbonhidrat_100g": 0,   "yag_100g": 14.0, "kategori": "Balık & Deniz Ürünleri"},
    {"isim": "Somon (ızgara)",             "isim_en": "Salmon (grilled)",              "kalori_100g": 216, "protein_100g": 23.0, "karbonhidrat_100g": 0,   "yag_100g": 13.0, "kategori": "Balık & Deniz Ürünleri"},
    {"isim": "Ton Balığı (çiğ)",           "isim_en": "Tuna (raw)",                    "kalori_100g": 132, "protein_100g": 28.0, "karbonhidrat_100g": 0,   "yag_100g": 1.3,  "kategori": "Balık & Deniz Ürünleri"},
    {"isim": "Ton Balığı (konserve, suda)","isim_en": "Tuna (canned in water)",        "kalori_100g": 116, "protein_100g": 25.5, "karbonhidrat_100g": 0,   "yag_100g": 1.0,  "kategori": "Balık & Deniz Ürünleri"},
    {"isim": "Levrek (ızgara)",            "isim_en": "Sea Bass (grilled)",            "kalori_100g": 124, "protein_100g": 24.0, "karbonhidrat_100g": 0,   "yag_100g": 3.0,  "kategori": "Balık & Deniz Ürünleri"},
    {"isim": "Çipura (ızgara)",            "isim_en": "Sea Bream (grilled)",           "kalori_100g": 120, "protein_100g": 22.0, "karbonhidrat_100g": 0,   "yag_100g": 3.5,  "kategori": "Balık & Deniz Ürünleri"},
    {"isim": "Hamsi (çiğ)",               "isim_en": "Anchovy (raw)",                 "kalori_100g": 131, "protein_100g": 20.0, "karbonhidrat_100g": 0,   "yag_100g": 5.8,  "kategori": "Balık & Deniz Ürünleri"},

    # ── Tahıl / Karbonhidrat ──────────────────────────────────────────────────
    {"isim": "Pirinç (çiğ)",               "isim_en": "Rice (raw)",                    "kalori_100g": 364, "protein_100g": 7.0,  "karbonhidrat_100g": 80.0, "yag_100g": 0.6,  "kategori": "Tahıl & Ekmek"},
    {"isim": "Pirinç Pilavı (pişmiş)",     "isim_en": "White Rice (cooked)",           "kalori_100g": 130, "protein_100g": 2.7,  "karbonhidrat_100g": 28.0, "yag_100g": 0.3,  "kategori": "Tahıl & Ekmek"},
    {"isim": "Makarna (çiğ)",              "isim_en": "Pasta (raw)",                   "kalori_100g": 371, "protein_100g": 13.0, "karbonhidrat_100g": 73.0, "yag_100g": 1.5,  "kategori": "Tahıl & Ekmek"},
    {"isim": "Makarna (pişmiş)",           "isim_en": "Pasta (cooked)",                "kalori_100g": 158, "protein_100g": 6.0,  "karbonhidrat_100g": 31.0, "yag_100g": 0.9,  "kategori": "Tahıl & Ekmek"},
    {"isim": "Bulgur (çiğ)",               "isim_en": "Bulgur Wheat (raw)",            "kalori_100g": 342, "protein_100g": 12.0, "karbonhidrat_100g": 70.0, "yag_100g": 1.3,  "kategori": "Tahıl & Ekmek"},
    {"isim": "Bulgur (pişmiş)",            "isim_en": "Bulgur Wheat (cooked)",         "kalori_100g": 83,  "protein_100g": 3.1,  "karbonhidrat_100g": 18.6, "yag_100g": 0.2,  "kategori": "Tahıl & Ekmek"},
    {"isim": "Yulaf Ezmesi (çiğ)",         "isim_en": "Oats (raw)",                    "kalori_100g": 389, "protein_100g": 17.0, "karbonhidrat_100g": 66.0, "yag_100g": 7.0,  "kategori": "Tahıl & Ekmek"},
    {"isim": "Yulaf Ezmesi (pişmiş)",      "isim_en": "Oatmeal (cooked)",              "kalori_100g": 71,  "protein_100g": 2.5,  "karbonhidrat_100g": 12.0, "yag_100g": 1.5,  "kategori": "Tahıl & Ekmek"},
    {"isim": "Tam Buğday Ekmeği",          "isim_en": "Whole Wheat Bread",             "kalori_100g": 247, "protein_100g": 9.0,  "karbonhidrat_100g": 48.0, "yag_100g": 3.0,  "kategori": "Tahıl & Ekmek"},
    {"isim": "Beyaz Ekmek",                "isim_en": "White Bread",                   "kalori_100g": 265, "protein_100g": 8.0,  "karbonhidrat_100g": 51.0, "yag_100g": 3.0,  "kategori": "Tahıl & Ekmek"},

    # ── Baklagil ──────────────────────────────────────────────────────────────
    {"isim": "Mercimek (çiğ)",             "isim_en": "Lentils (raw)",                 "kalori_100g": 352, "protein_100g": 25.0, "karbonhidrat_100g": 60.0, "yag_100g": 1.1,  "kategori": "Baklagil"},
    {"isim": "Mercimek Çorbası (pişmiş)",  "isim_en": "Lentil Soup (cooked)",          "kalori_100g": 65,  "protein_100g": 4.5,  "karbonhidrat_100g": 9.5,  "yag_100g": 1.3,  "kategori": "Baklagil"},
    {"isim": "Nohut (çiğ)",               "isim_en": "Chickpeas (raw)",               "kalori_100g": 364, "protein_100g": 19.0, "karbonhidrat_100g": 61.0, "yag_100g": 6.0,  "kategori": "Baklagil"},
    {"isim": "Nohut (haşlanmış)",          "isim_en": "Chickpeas (boiled)",            "kalori_100g": 164, "protein_100g": 8.9,  "karbonhidrat_100g": 27.0, "yag_100g": 2.6,  "kategori": "Baklagil"},
    {"isim": "Fasulye (haşlanmış)",        "isim_en": "White Beans (boiled)",          "kalori_100g": 139, "protein_100g": 9.0,  "karbonhidrat_100g": 25.0, "yag_100g": 0.5,  "kategori": "Baklagil"},

    # ── Yumurta ───────────────────────────────────────────────────────────────
    {"isim": "Yumurta (çiğ, 1 adet ~60g)","isim_en": "Egg (raw, 1 pc ~60g)",          "kalori_100g": 143, "protein_100g": 13.0, "karbonhidrat_100g": 0.7,  "yag_100g": 9.5,  "kategori": "Yumurta & Süt"},
    {"isim": "Yumurta (haşlanmış)",        "isim_en": "Egg (boiled)",                  "kalori_100g": 155, "protein_100g": 13.0, "karbonhidrat_100g": 1.1,  "yag_100g": 11.0, "kategori": "Yumurta & Süt"},
    {"isim": "Yumurta Akı (çiğ)",          "isim_en": "Egg White (raw)",               "kalori_100g": 52,  "protein_100g": 11.0, "karbonhidrat_100g": 0.7,  "yag_100g": 0.2,  "kategori": "Yumurta & Süt"},
    {"isim": "Yumurta Sarısı (çiğ)",       "isim_en": "Egg Yolk (raw)",                "kalori_100g": 322, "protein_100g": 16.0, "karbonhidrat_100g": 3.6,  "yag_100g": 27.0, "kategori": "Yumurta & Süt"},

    # ── Süt Ürünleri ──────────────────────────────────────────────────────────
    {"isim": "Süt (tam yağlı)",            "isim_en": "Whole Milk",                    "kalori_100g": 61,  "protein_100g": 3.2,  "karbonhidrat_100g": 4.8,  "yag_100g": 3.3,  "kategori": "Yumurta & Süt"},
    {"isim": "Süt (yarım yağlı)",          "isim_en": "Semi-skimmed Milk",             "kalori_100g": 46,  "protein_100g": 3.4,  "karbonhidrat_100g": 4.8,  "yag_100g": 1.5,  "kategori": "Yumurta & Süt"},
    {"isim": "Yoğurt (tam yağlı)",         "isim_en": "Yogurt (full fat)",             "kalori_100g": 61,  "protein_100g": 3.5,  "karbonhidrat_100g": 4.7,  "yag_100g": 3.3,  "kategori": "Yumurta & Süt"},
    {"isim": "Yoğurt (light)",             "isim_en": "Yogurt (low fat)",              "kalori_100g": 40,  "protein_100g": 4.0,  "karbonhidrat_100g": 4.5,  "yag_100g": 0.5,  "kategori": "Yumurta & Süt"},
    {"isim": "Lor Peyniri",                "isim_en": "Cottage Cheese",                "kalori_100g": 98,  "protein_100g": 11.0, "karbonhidrat_100g": 3.4,  "yag_100g": 4.3,  "kategori": "Yumurta & Süt"},
    {"isim": "Beyaz Peynir",               "isim_en": "White Cheese (Feta-style)",     "kalori_100g": 264, "protein_100g": 17.0, "karbonhidrat_100g": 2.0,  "yag_100g": 21.0, "kategori": "Yumurta & Süt"},
    {"isim": "Kaşar Peyniri",              "isim_en": "Kashar Cheese",                 "kalori_100g": 390, "protein_100g": 25.0, "karbonhidrat_100g": 2.0,  "yag_100g": 31.0, "kategori": "Yumurta & Süt"},
    {"isim": "Süzme Yoğurt",               "isim_en": "Strained Yogurt (Greek-style)", "kalori_100g": 97,  "protein_100g": 9.0,  "karbonhidrat_100g": 4.0,  "yag_100g": 5.0,  "kategori": "Yumurta & Süt"},

    # ── Meyve ─────────────────────────────────────────────────────────────────
    {"isim": "Elma",                       "isim_en": "Apple",                         "kalori_100g": 52,  "protein_100g": 0.3,  "karbonhidrat_100g": 14.0, "yag_100g": 0.2,  "kategori": "Meyve"},
    {"isim": "Muz",                        "isim_en": "Banana",                        "kalori_100g": 89,  "protein_100g": 1.1,  "karbonhidrat_100g": 23.0, "yag_100g": 0.3,  "kategori": "Meyve"},
    {"isim": "Portakal",                   "isim_en": "Orange",                        "kalori_100g": 47,  "protein_100g": 0.9,  "karbonhidrat_100g": 12.0, "yag_100g": 0.1,  "kategori": "Meyve"},
    {"isim": "Çilek",                      "isim_en": "Strawberry",                    "kalori_100g": 32,  "protein_100g": 0.7,  "karbonhidrat_100g": 7.7,  "yag_100g": 0.3,  "kategori": "Meyve"},
    {"isim": "Karpuz",                     "isim_en": "Watermelon",                    "kalori_100g": 30,  "protein_100g": 0.6,  "karbonhidrat_100g": 7.6,  "yag_100g": 0.2,  "kategori": "Meyve"},
    {"isim": "Üzüm",                       "isim_en": "Grapes",                        "kalori_100g": 69,  "protein_100g": 0.7,  "karbonhidrat_100g": 18.0, "yag_100g": 0.2,  "kategori": "Meyve"},

    # ── Sebze ─────────────────────────────────────────────────────────────────
    {"isim": "Domates",                    "isim_en": "Tomato",                        "kalori_100g": 18,  "protein_100g": 0.9,  "karbonhidrat_100g": 3.9,  "yag_100g": 0.2,  "kategori": "Sebze"},
    {"isim": "Salatalık",                  "isim_en": "Cucumber",                      "kalori_100g": 15,  "protein_100g": 0.7,  "karbonhidrat_100g": 3.6,  "yag_100g": 0.1,  "kategori": "Sebze"},
    {"isim": "Patates (çiğ)",             "isim_en": "Potato (raw)",                  "kalori_100g": 77,  "protein_100g": 2.0,  "karbonhidrat_100g": 17.0, "yag_100g": 0.1,  "kategori": "Sebze"},
    {"isim": "Patates (haşlanmış)",        "isim_en": "Potato (boiled)",               "kalori_100g": 86,  "protein_100g": 1.7,  "karbonhidrat_100g": 20.0, "yag_100g": 0.1,  "kategori": "Sebze"},
    {"isim": "Havuç",                      "isim_en": "Carrot",                        "kalori_100g": 41,  "protein_100g": 0.9,  "karbonhidrat_100g": 10.0, "yag_100g": 0.2,  "kategori": "Sebze"},
    {"isim": "Brokoli",                    "isim_en": "Broccoli",                      "kalori_100g": 34,  "protein_100g": 2.8,  "karbonhidrat_100g": 7.0,  "yag_100g": 0.4,  "kategori": "Sebze"},
    {"isim": "Ispanak",                    "isim_en": "Spinach",                       "kalori_100g": 23,  "protein_100g": 2.9,  "karbonhidrat_100g": 3.6,  "yag_100g": 0.4,  "kategori": "Sebze"},
    {"isim": "Soğan",                      "isim_en": "Onion",                         "kalori_100g": 40,  "protein_100g": 1.1,  "karbonhidrat_100g": 9.3,  "yag_100g": 0.1,  "kategori": "Sebze"},
    {"isim": "Sarımsak",                   "isim_en": "Garlic",                        "kalori_100g": 149, "protein_100g": 6.4,  "karbonhidrat_100g": 33.0, "yag_100g": 0.5,  "kategori": "Sebze"},

    # ── Yağ & Kuruyemiş ───────────────────────────────────────────────────────
    {"isim": "Zeytinyağı",                 "isim_en": "Olive Oil",                     "kalori_100g": 884, "protein_100g": 0,    "karbonhidrat_100g": 0,    "yag_100g": 100.0,"kategori": "Yağ & Kuruyemiş"},
    {"isim": "Tereyağı",                   "isim_en": "Butter",                        "kalori_100g": 717, "protein_100g": 0.9,  "karbonhidrat_100g": 0.1,  "yag_100g": 81.0, "kategori": "Yağ & Kuruyemiş"},
    {"isim": "Badem",                      "isim_en": "Almonds",                       "kalori_100g": 579, "protein_100g": 21.0, "karbonhidrat_100g": 22.0, "yag_100g": 50.0, "kategori": "Yağ & Kuruyemiş"},
    {"isim": "Ceviz",                      "isim_en": "Walnuts",                       "kalori_100g": 654, "protein_100g": 15.0, "karbonhidrat_100g": 14.0, "yag_100g": 65.0, "kategori": "Yağ & Kuruyemiş"},
    {"isim": "Fındık",                     "isim_en": "Hazelnuts",                     "kalori_100g": 628, "protein_100g": 15.0, "karbonhidrat_100g": 17.0, "yag_100g": 61.0, "kategori": "Yağ & Kuruyemiş"},
    {"isim": "Fıstık Ezmesi",              "isim_en": "Peanut Butter",                 "kalori_100g": 588, "protein_100g": 25.0, "karbonhidrat_100g": 20.0, "yag_100g": 50.0, "kategori": "Yağ & Kuruyemiş"},

    # ── Protein Takviyesi ─────────────────────────────────────────────────────
    {"isim": "Whey Protein Tozu",          "isim_en": "Whey Protein Powder",           "kalori_100g": 380, "protein_100g": 75.0, "karbonhidrat_100g": 8.0,  "yag_100g": 5.0,  "kategori": "Takviye"},
    {"isim": "Protein Tozu (genel)",       "isim_en": "Protein Powder (general)",      "kalori_100g": 370, "protein_100g": 70.0, "karbonhidrat_100g": 10.0, "yag_100g": 5.0,  "kategori": "Takviye"},

    # ── Fast Food ─────────────────────────────────────────────────────────────
    {"isim": "Tavuk Döner (dürüm)",        "isim_en": "Chicken Döner Wrap",            "kalori_100g": 210, "protein_100g": 14.0, "karbonhidrat_100g": 22.0, "yag_100g": 8.0,  "kategori": "Fast Food"},
    {"isim": "Lahmacun",                   "isim_en": "Turkish Flatbread Pizza",       "kalori_100g": 220, "protein_100g": 10.0, "karbonhidrat_100g": 28.0, "yag_100g": 7.0,  "kategori": "Fast Food"},
    {"isim": "Pide (kıymalı)",             "isim_en": "Turkish Pide (minced meat)",    "kalori_100g": 240, "protein_100g": 11.0, "karbonhidrat_100g": 30.0, "yag_100g": 9.0,  "kategori": "Fast Food"},
]

eklenen = 0
guncellenen = 0
atlanan = 0

for yemek in YEMEKLER:
    mevcut = supabase.table("yemekler").select("id, isim_en").ilike("isim", yemek["isim"]).execute()
    if mevcut.data:
        kayit = mevcut.data[0]
        # isim_en eksikse güncelle
        if not kayit.get("isim_en") and yemek.get("isim_en"):
            supabase.table("yemekler").update({"isim_en": yemek["isim_en"]}).eq("id", kayit["id"]).execute()
            print(f"🔄 Güncellendi: {yemek['isim']} → {yemek['isim_en']}")
            guncellenen += 1
        else:
            print(f"⏭️  Atlandı:    {yemek['isim']}")
            atlanan += 1
    else:
        veri = {**yemek, "kaynak": "sistem"}
        supabase.table("yemekler").insert(veri).execute()
        print(f"✅ Eklendi:    {yemek['isim']}")
        eklenen += 1

print(f"\n{'─'*50}")
print(f"✅ {eklenen} eklendi  |  🔄 {guncellenen} güncellendi  |  ⏭️  {atlanan} atlandı")
