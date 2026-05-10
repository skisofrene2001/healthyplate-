import React, { createContext, useContext, useState, useEffect } from 'react';

const TRANSLATIONS = {
  fr: {
    nav_home: "Accueil",
    nav_ingredients: "Ingrédients",
    nav_archives: "Archives",
    nav_settings: "Paramètres",
    nav_login: "Connexion",
    nav_logout: "Déconnexion",
    
    home_title: "🍳 Configurer",
    home_meal_types: "Types de repas",
    home_duration: "Durée",
    home_budget: "Budget",
    home_diet: "Préférences diététiques",
    home_inspiration: "Inspiration Culinaire",
    home_antigaspi: "Anti-Gaspi (Dans mon frigo / sur ma table)",
    home_scan: "📷 Scanner une image",
    home_scanning: "⏳ Scan...",
    home_generate: "✨ Générer mon plan",
    home_generating: "⏳ Génération...",
    
    region_all: "🌍 Région (Toutes)",
    country_all: "🏳️ Pays (Tous)",
    
    with_budget: "Avec budget",
    no_budget: "Sans contrainte",

    meal_petit_dejeuner: "☀️ Petit-déj",
    meal_dejeuner: "🍽️ Déjeuner",
    meal_diner: "🌙 Dîner",
    meal_snack: "🍎 Snack",

    dur_1_repas: "1 repas",
    dur_1_jour: "1 journée",
    dur_3_jours: "3 jours",
    dur_5_jours: "5 jours",
    dur_1_semaine: "1 semaine",
    dur_1_mois: "1 mois",
    dur_custom: "Personnalisé",

    pref_veg: "Végétarien",
    pref_gf: "Sans Gluten",
    pref_mass: "Prise de masse",
    pref_loss: "Perte de poids",
    
    reg_med: "Méditerranée",
    reg_lat: "Amérique Latine",
    reg_asia: "Asie",
    reg_mid: "Moyen-Orient",
    reg_euro: "Europe du Nord",
    reg_afr: "Afrique",
    
    c_alg: "Algérie",
    c_ita: "Italie",
    c_mex: "Mexique",
    c_jap: "Japon",
    c_lib: "Liban",
    c_mar: "Maroc",
    c_gre: "Grèce",
    c_esp: "Espagne"
  },
  en: {
    nav_home: "Home",
    nav_ingredients: "Ingredients",
    nav_archives: "Archives",
    nav_settings: "Settings",
    nav_login: "Login",
    nav_logout: "Logout",
    
    home_title: "🍳 Configure",
    home_meal_types: "Meal Types",
    home_duration: "Duration",
    home_budget: "Budget",
    home_diet: "Dietary Preferences",
    home_inspiration: "Culinary Inspiration",
    home_antigaspi: "Anti-Waste (In my fridge / on my table)",
    home_scan: "📷 Scan Image",
    home_scanning: "⏳ Scanning...",
    home_generate: "✨ Generate my plan",
    home_generating: "⏳ Generating...",
    
    region_all: "🌍 Region (All)",
    country_all: "🏳️ Country (All)",
    
    with_budget: "With budget",
    no_budget: "No constraint",

    meal_petit_dejeuner: "☀️ Breakfast",
    meal_dejeuner: "🍽️ Lunch",
    meal_diner: "🌙 Dinner",
    meal_snack: "🍎 Snack",

    dur_1_repas: "1 meal",
    dur_1_jour: "1 day",
    dur_3_jours: "3 days",
    dur_5_jours: "5 days",
    dur_1_semaine: "1 week",
    dur_1_mois: "1 month",
    dur_custom: "Custom",

    pref_veg: "Vegetarian",
    pref_gf: "Gluten Free",
    pref_mass: "Muscle Gain",
    pref_loss: "Weight Loss",
    
    reg_med: "Mediterranean",
    reg_lat: "Latin America",
    reg_asia: "Asia",
    reg_mid: "Middle East",
    reg_euro: "Northern Europe",
    reg_afr: "Africa",
    
    c_alg: "Algeria",
    c_ita: "Italy",
    c_mex: "Mexico",
    c_jap: "Japan",
    c_lib: "Lebanon",
    c_mar: "Morocco",
    c_gre: "Greece",
    c_esp: "Spain"
  },
  ar: {
    nav_home: "الرئيسية",
    nav_ingredients: "المكونات",
    nav_archives: "الأرشيف",
    nav_settings: "الإعدادات",
    nav_login: "تسجيل الدخول",
    nav_logout: "تسجيل الخروج",
    
    home_title: "🍳 إعداد",
    home_meal_types: "أنواع الوجبات",
    home_duration: "المدة",
    home_budget: "الميزانية",
    home_diet: "التفضيلات الغذائية",
    home_inspiration: "إلهام الطهي",
    home_antigaspi: "ضد الهدر (في ثلاجتي / على طاولتي)",
    home_scan: "📷 مسح صورة",
    home_scanning: "⏳ جاري المسح...",
    home_generate: "✨ توليد خطتي",
    home_generating: "⏳ جاري التوليد...",
    
    region_all: "🌍 المنطقة (الكل)",
    country_all: "🏳️ البلد (الكل)",
    
    with_budget: "بميزانية",
    no_budget: "بدون قيود",

    meal_petit_dejeuner: "☀️ فطور",
    meal_dejeuner: "🍽️ غداء",
    meal_diner: "🌙 عشاء",
    meal_snack: "🍎 وجبة خفيفة",

    dur_1_repas: "وجبة 1",
    dur_1_jour: "يوم 1",
    dur_3_jours: "3 أيام",
    dur_5_jours: "5 أيام",
    dur_1_semaine: "أسبوع 1",
    dur_1_mois: "شهر 1",
    dur_custom: "مخصص",

    pref_veg: "نباتي",
    pref_gf: "خالي من الغلوتين",
    pref_mass: "زيادة العضلات",
    pref_loss: "فقدان الوزن",
    
    reg_med: "البحر المتوسط",
    reg_lat: "أمريكا اللاتينية",
    reg_asia: "آسيا",
    reg_mid: "الشرق الأوسط",
    reg_euro: "شمال أوروبا",
    reg_afr: "أفريقيا",
    
    c_alg: "الجزائر",
    c_ita: "إيطاليا",
    c_mex: "المكسيك",
    c_jap: "اليابان",
    c_lib: "لبنان",
    c_mar: "المغرب",
    c_gre: "اليونان",
    c_esp: "إسبانيا"
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('hp_lang') || 'fr');

  useEffect(() => {
    localStorage.setItem('hp_lang', lang);
    if (lang === 'ar') document.body.setAttribute('dir', 'rtl');
    else document.body.setAttribute('dir', 'ltr');
  }, [lang]);

  const t = (key) => TRANSLATIONS[lang][key] || TRANSLATIONS['fr'][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
