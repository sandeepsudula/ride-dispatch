// Wix Forms data layer for the Ride Dispatch site: the verified REST layer and form store from
// github.com/wix/skills (wix-headless-templates/forms, commit 975357e), bundled with esbuild.
// Visitor-only: the client id below mints anonymous visitor tokens and is not a secret.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// config.ts
var WIX_CLIENT_ID = "f55ffdf8-f4d5-465c-adf2-9ebbfe454f06";

// client.ts
var WIX_API_BASE = "https://www.wixapis.com";
var TOKEN_URL = `${WIX_API_BASE}/oauth2/token`;
var STORAGE_KEY = `wix-visitor-${WIX_CLIENT_ID}`;
var memory = null;
var browserTokenStore = {
  load() {
    if (memory) return memory;
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) memory = JSON.parse(raw);
    } catch {
    }
    return memory;
  },
  save(tokens) {
    memory = tokens;
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
    }
  }
};
var store = browserTokenStore;
async function mintTokens(body, role = "visitor") {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: WIX_CLIENT_ID, ...body })
  });
  if (!res.ok) throw new Error(`Wix auth failed (${res.status}).`);
  const data = await res.json();
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1e3, role };
}
async function accessToken() {
  const t = store.load();
  if (t && t.expiresAt - 6e4 > Date.now()) return t.accessToken;
  let fresh;
  if (t?.refreshToken) {
    try {
      fresh = await mintTokens({ grantType: "refresh_token", refreshToken: t.refreshToken }, t.role ?? "visitor");
    } catch {
    }
  }
  fresh ?? (fresh = await mintTokens({ grantType: "anonymous" }));
  store.save(fresh);
  return fresh.accessToken;
}
var WixApiError = class extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    /** The response's `details` as Wix sent it (applicationError, validationError) — for callers that map codes. */
    __publicField(this, "details");
    this.details = details;
  }
};
async function wixRequest(path, { method = "POST", body, query } = {}) {
  const url = new URL(path, WIX_API_BASE);
  for (const [k, v] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(v) ? v : [v]) url.searchParams.append(k, String(item));
  }
  const res = await fetch(url, {
    method,
    headers: { Authorization: await accessToken(), "Content-Type": "application/json" },
    body: body === void 0 ? void 0 : JSON.stringify(body)
  });
  if (!res.ok) {
    let message = "", code, details;
    try {
      const j = await res.json();
      message = j?.message ?? "";
      code = j?.details?.applicationError?.code;
      details = j?.details;
    } catch {
    }
    throw new WixApiError(message || `${method} ${url.pathname} failed (${res.status}).`, res.status, code, details);
  }
  return res.status === 204 ? null : await res.json();
}

// media.ts
var STATIC = "https://static.wixstatic.com/media";
var BARE_FILE_ID = /^[\w-]+~mv2\.[a-z0-9]+$/i;
function rawOf(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  const o = value;
  if (o.image != null && typeof o.image === "object") return rawOf(o.image);
  return (typeof o.image === "string" ? o.image : null) ?? o.url ?? o.id ?? "";
}
function fileOf(v) {
  if (v.startsWith("wix:image://")) return v.slice("wix:image://v1/".length).split("/")[0].split("#")[0];
  if (BARE_FILE_ID.test(v)) return v;
  const m = v.match(/^https:\/\/static\.wixstatic\.com\/media\/([^/?#]+)/);
  return m ? m[1] : "";
}
function imgSrc(value, width = 600, height = 600) {
  const v = rawOf(value);
  if (!v) return "";
  const file = fileOf(v);
  if (file) return `${STATIC}/${file}/v1/fill/w_${width},h_${height},al_c,q_90/${file}`;
  return v;
}

// address-templates.generated.ts
var ADDRESS_TEMPLATES = { "defaultTemplate": "COMMON", "byCountry": { "US": "US", "UY": "COMMON_STATE", "TH": "COMMON_STATE", "TR": "COMMON_STATE", "SZ": "COMMON_STATE", "ZA": "COMMON_STATE", "SE": "COMMON_STATE", "SI": "COMMON_STATE", "SK": "COMMON_STATE", "RS": "COMMON_STATE", "SB": "COMMON_STATE", "SG": "COMMON_STATE", "SN": "COMMON_STATE", "SD": "COMMON_STATE", "RU": "COMMON_STATE", "RO": "COMMON_STATE", "PY": "COMMON_STATE", "PT": "COMMON_STATE", "PL": "COMMON_STATE", "PH": "COMMON_STATE", "PE": "COMMON_STATE", "PA": "COMMON_STATE", "PK": "COMMON_STATE", "NZ": "COMMON_STATE", "NO": "COMMON_STATE", "NG": "COMMON_STATE", "NL": "COMMON_STATE", "MY": "COMMON_STATE", "MH": "COMMON_STATE", "MX": "COMMON_STATE", "KR": "COMMON_STATE", "JP": "JP", "IT": "COMMON_STATE", "IS": "COMMON_STATE", "IE": "COMMON_STATE", "IN": "COMMON_STATE", "IL": "IL", "ID": "COMMON_STATE", "HU": "COMMON_STATE", "HR": "COMMON_STATE", "GR": "COMMON_STATE", "GB": "GB", "FR": "FR", "ES": "ES", "EG": "COMMON_STATE", "DO": "COMMON_STATE", "DK": "COMMON_STATE", "DE": "DE", "CZ": "COMMON_STATE", "CY": "COMMON_STATE", "CR": "COMMON_STATE", "CO": "COMMON_STATE", "CI": "COMMON_STATE", "CN": "COMMON_STATE", "CL": "COMMON_STATE", "CH": "COMMON_STATE", "CA": "CA", "CF": "COMMON_STATE", "BR": "BR", "BS": "COMMON_STATE", "BE": "COMMON_STATE", "BG": "COMMON_STATE", "AT": "COMMON_STATE", "AU": "AU", "AR": "COMMON_STATE", "AE": "COMMON_STATE" }, "templates": { "COMMON": [{ "sub": "addressLine", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }, { "sub": "city", "required": true, "hidden": false }, { "sub": "postalCode", "required": true, "hidden": false }], "US": [{ "sub": "addressLine", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }, { "sub": "city", "required": true, "hidden": false }, { "sub": "subdivision", "required": true, "hidden": false }, { "sub": "postalCode", "required": true, "hidden": false }], "COMMON_STATE": [{ "sub": "addressLine", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }, { "sub": "city", "required": true, "hidden": false }, { "sub": "subdivision", "required": true, "hidden": false }, { "sub": "postalCode", "required": true, "hidden": false }], "JP": [{ "sub": "postalCode", "required": true, "hidden": false }, { "sub": "subdivision", "required": true, "hidden": false }, { "sub": "city", "required": true, "hidden": false }, { "sub": "addressLine", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }], "IL": [{ "sub": "streetName", "required": true, "hidden": false }, { "sub": "streetNumber", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": false }, { "sub": "city", "required": true, "hidden": false }, { "sub": "postalCode", "required": false, "hidden": false }], "GB": [{ "sub": "addressLine", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }, { "sub": "city", "required": true, "hidden": false }, { "sub": "subdivision", "required": true, "hidden": false }, { "sub": "postalCode", "required": true, "hidden": false }], "FR": [{ "sub": "addressLine", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }, { "sub": "postalCode", "required": true, "hidden": false }, { "sub": "city", "required": true, "hidden": false }, { "sub": "subdivision", "required": true, "hidden": false }], "ES": [{ "sub": "addressLine", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }, { "sub": "city", "required": true, "hidden": false }, { "sub": "subdivision", "required": true, "hidden": false }, { "sub": "postalCode", "required": true, "hidden": false }], "DE": [{ "sub": "streetName", "required": true, "hidden": false }, { "sub": "streetNumber", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }, { "sub": "postalCode", "required": true, "hidden": false }, { "sub": "city", "required": true, "hidden": false }, { "sub": "subdivision", "required": true, "hidden": false }], "CA": [{ "sub": "addressLine", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }, { "sub": "city", "required": true, "hidden": false }, { "sub": "subdivision", "required": true, "hidden": false }, { "sub": "postalCode", "required": true, "hidden": false }], "BR": [{ "sub": "streetName", "required": true, "hidden": false }, { "sub": "streetNumber", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }, { "sub": "city", "required": true, "hidden": false }, { "sub": "subdivision", "required": true, "hidden": false }, { "sub": "postalCode", "required": true, "hidden": false }], "AU": [{ "sub": "addressLine", "required": true, "hidden": false }, { "sub": "addressLine2", "required": false, "hidden": true }, { "sub": "city", "required": true, "hidden": false }, { "sub": "subdivision", "required": true, "hidden": false }, { "sub": "postalCode", "required": true, "hidden": false }] }, "countryNames": { "AW": "Aruba", "AO": "Angola", "AF": "Afghanistan", "AI": "Anguilla", "AX": "Aland Islands", "AL": "Albania", "AD": "Andorra", "AE": "United Arab Emirates", "AR": "Argentina", "AM": "Armenia", "AS": "American Samoa", "AQ": "Antarctica", "TF": "French Southern Territories", "AG": "Antigua and Barbuda", "AU": "Australia", "AT": "Austria", "AZ": "Azerbaijan", "BI": "Burundi", "BE": "Belgium", "BJ": "Benin", "BQ": "Bonaire", "BF": "Burkina Faso", "BD": "Bangladesh", "BG": "Bulgaria", "BH": "Bahrain", "BS": "Bahamas", "BA": "Bosnia and Herzegovina", "BL": "Saint Barth\xE9lemy", "BY": "Belarus", "BZ": "Belize", "BM": "Bermuda", "BO": "Bolivia", "BR": "Brazil", "BB": "Barbados", "BN": "Brunei", "BT": "Bhutan", "BV": "Bouvet Island", "BW": "Botswana", "CF": "Central African Republic", "CA": "Canada", "CC": "Cocos (Keeling) Islands", "CH": "Switzerland", "CL": "Chile", "CN": "China", "CI": "Republic of C\xF4te d\u2019Ivoire", "CM": "Cameroon", "CD": "Congo (Kinshasa)", "CG": "Congo (Brazzaville)", "CK": "Cook Islands", "CO": "Colombia", "KM": "Comoros", "CV": "Cape Verde", "CR": "Costa Rica", "CU": "Cuba", "CW": "Cura\xE7ao", "CX": "Christmas Island", "KY": "Cayman Islands", "CY": "Cyprus", "CZ": "Czech Republic", "DE": "Germany", "DJ": "Djibouti", "DM": "Dominica", "DK": "Denmark", "DO": "Dominican Republic", "DZ": "Algeria", "EC": "Ecuador", "EG": "Egypt", "ER": "Eritrea", "EH": "Western Sahara", "ES": "Spain", "EE": "Estonia", "ET": "Ethiopia", "FI": "Finland", "FJ": "Fiji", "FK": "Falkland Islands", "FR": "France", "FO": "Faroe Islands", "FM": "Micronesia", "GA": "Gabon", "GB": "United Kingdom", "GE": "Georgia", "GG": "Guernsey", "GH": "Ghana", "GI": "Gibraltar", "GN": "Guinea", "GP": "Guadeloupe", "GM": "Gambia", "GW": "Guinea-Bissau", "GQ": "Equatorial Guinea", "GR": "Greece", "GD": "Grenada", "GL": "Greenland", "GT": "Guatemala", "GF": "French Guiana", "GU": "Guam", "GY": "Guyana", "HK": "Hong Kong", "HM": "Heard Island and McDonald Islands", "HN": "Honduras", "HR": "Croatia", "HT": "Haiti", "HU": "Hungary", "ID": "Indonesia", "IM": "Isle of Man", "IN": "India", "IO": "British Indian Ocean Territory", "IE": "Ireland", "IR": "Iran", "IS": "Iceland", "IL": "Israel", "IT": "Italy", "IQ": "Iraq", "JM": "Jamaica", "JE": "Jersey", "JO": "Jordan", "JP": "Japan", "KZ": "Kazakhstan", "KE": "Kenya", "KG": "Kyrgyzstan", "KH": "Cambodia", "KI": "Kiribati", "KN": "Saint Kitts and Nevis", "KR": "South Korea", "XK": "Kosovo", "KW": "Kuwait", "LA": "Laos", "LB": "Lebanon", "LR": "Liberia", "LY": "Libya", "LC": "Saint Lucia", "LI": "Liechtenstein", "LK": "Sri Lanka", "LS": "Lesotho", "LT": "Lithuania", "LU": "Luxembourg", "LV": "Latvia", "MO": "Macau", "MF": "Saint Martin", "MA": "Morocco", "MC": "Monaco", "MD": "Moldova", "MG": "Madagascar", "MV": "Maldives", "MX": "Mexico", "MH": "Marshall Islands", "MK": "Macedonia", "ML": "Mali", "MT": "Malta", "MM": "Myanmar", "ME": "Montenegro", "MN": "Mongolia", "MP": "Northern Mariana Islands", "MZ": "Mozambique", "MR": "Mauritania", "MS": "Montserrat", "MQ": "Martinique", "MU": "Mauritius", "MW": "Malawi", "MY": "Malaysia", "YT": "Mayotte", "NA": "Namibia", "NC": "New Caledonia", "NE": "Niger", "NF": "Norfolk Island", "NG": "Nigeria", "NI": "Nicaragua", "NU": "Niue", "NL": "Netherlands", "NO": "Norway", "NP": "Nepal", "NR": "Nauru", "NZ": "New Zealand", "OM": "Oman", "PK": "Pakistan", "PA": "Panama", "PN": "Pitcairn", "PE": "Peru", "PH": "Philippines", "PW": "Palau", "PG": "Papua New Guinea", "PL": "Poland", "PR": "Puerto Rico", "KP": "North Korea", "PT": "Portugal", "PY": "Paraguay", "PS": "Palestinian Territories", "PF": "French Polynesia", "QA": "Qatar", "RE": "Reunion", "RO": "Romania", "RU": "Russia", "RW": "Rwanda", "SA": "Saudi Arabia", "SD": "Sudan", "SN": "Senegal", "SG": "Singapore", "GS": "South Georgia and the South Sandwich Islands", "SH": "Saint Helena", "SJ": "Svalbard and Jan Mayen", "SB": "Solomon Islands", "SL": "Sierra Leone", "SV": "El Salvador", "SM": "San Marino", "SO": "Somalia", "PM": "Saint Pierre and Miquelon", "RS": "Serbia", "SS": "South Sudan", "ST": "Sao Tome and Principe", "SR": "Suriname", "SK": "Slovakia", "SI": "Slovenia", "SE": "Sweden", "SZ": "Swaziland", "SX": "Sint Maarten", "SC": "Seychelles", "SY": "Syria", "TC": "Turks and Caicos Islands", "TD": "Chad", "TG": "Togo", "TH": "Thailand", "TJ": "Tajikistan", "TK": "Tokelau", "TM": "Turkmenistan", "TL": "East Timor", "TO": "Tonga", "TT": "Trinidad and Tobago", "TN": "Tunisia", "TR": "Turkey", "TV": "Tuvalu", "TW": "Taiwan", "TZ": "Tanzania", "UG": "Uganda", "UA": "Ukraine", "UM": "United States Minor Outlying Islands", "UY": "Uruguay", "US": "United States", "UZ": "Uzbekistan", "VA": "Vatican", "VC": "Saint Vincent and the Grenadines", "VE": "Venezuela", "VG": "British Virgin Islands", "VI": "U.S. Virgin Islands", "VN": "Vietnam", "VU": "Vanuatu", "WF": "Wallis and Futuna", "WS": "Samoa", "YE": "Yemen", "ZA": "South Africa", "ZM": "Zambia", "ZW": "Zimbabwe" }, "subdivisions": { "AE": { "label": "State", "list": [["DU", "Dubai"], ["SH", "Sharjah"], ["UQ", "Umm Al Quawain"], ["AJ", "Ajman"], ["FU", "Fujairah"], ["AD", "Abu Dhabi"], ["RK", "Ras al Khaimah"]] }, "AR": { "label": "Region", "list": [["A", "Salta"], ["B", "Buenos Aires"], ["D", "San Luis"], ["E", "Entre R\xEDos"], ["F", "La Rioja"], ["G", "Santiago del Estero"], ["H", "Chaco"], ["J", "San Juan"], ["K", "Catamarca"], ["L", "La Pampa"], ["M", "Mendoza"], ["N", "Misiones"], ["P", "Formosa"], ["Q", "Neuqu\xE9n"], ["R", "R\xEDo Negro"], ["S", "Santa Fe"], ["T", "Tucum\xE1n"], ["U", "Chubut"], ["V", "Tierra del Fuego"], ["W", "Corrientes"], ["X", "C\xF3rdoba"], ["Y", "Jujuy"], ["Z", "Santa Cruz"]] }, "AU": { "label": "Region", "list": [["ACT", "Australian Capital Territory"], ["NSW", "New South Wales"], ["NT", "Northern Territory"], ["QLD", "Queensland"], ["SA", "South Australia"], ["TAS", "Tasmania"], ["VIC", "Victoria"], ["WA", "Western Australia"]] }, "AT": { "label": "Region", "list": [["1", "Burgenland"], ["2", "K\xE4rnten"], ["3", "Nieder\xF6sterreich"], ["4", "Ober\xF6sterreich"], ["5", "Salzburg"], ["6", "Steiermark"], ["7", "Tirol"], ["8", "Vorarlberg"], ["9", "Wien"]] }, "BE": { "label": "Province", "list": [["BRU", "Brussels Hoofdstedelijk Gewest"], ["VAN", "Antwerpen"], ["VBR", "Vlaams-Brabant"], ["VLG", "Vlaams Gewest"], ["VLI", "Limburg"], ["VOV", "Oost-Vlaanderen"], ["VWV", "West-Vlaanderen"], ["WAL", "wallonne"], ["WBR", "Brabant wallon"], ["WHT", "Hainaut"], ["WLX", "Luxembourg"], ["WLG", "Li\xE8ge"], ["WNA", "Namur"]] }, "BG": { "label": "Province", "list": [["01", "Blagoevgrad"], ["02", "Burgas"], ["08", "Dobrich"], ["07", "Gabrovo"], ["26", "Haskovo"], ["09", "Kardzhali"], ["10", "Kyustendil"], ["11", "Lovech"], ["12", "Montana"], ["13", "Pazardzhik"], ["14", "Pernik"], ["15", "Pleven"], ["16", "Plovdiv"], ["17", "Razgrad"], ["18", "Ruse"], ["27", "Shumen"], ["19", "Silistra"], ["20", "Sliven"], ["21", "Smolyan"], ["23", "Sofia City"], ["22", "Sofia (province)"], ["24", "Stara Zagora"], ["25", "Targovishte"], ["03", "Varna"], ["04", "Veliko Tarnovo"], ["05", "Vidin"], ["06", "Vratsa"], ["28", "Yambol"]] }, "BS": { "label": "Region", "list": [["FC", "Fresh Creek"], ["FP", "Freeport"], ["HI", "Harbour Island"], ["HR", "High Rock"], ["LI", "Long Island"], ["MH", "Marsh Harbour"], ["NP", "New Providence"], ["RS", "Rock Sound"]] }, "BR": { "label": "State", "list": [["AC", "Acre"], ["AL", "Alagoas"], ["AM", "Amazonas"], ["AP", "Amapa"], ["BA", "Bahia"], ["CE", "Ceara"], ["DF", "Distrito Federal"], ["ES", "Espirito Santo"], ["GO", "Goias"], ["MA", "Maranhao"], ["MG", "Minas Gerais"], ["MS", "Mato Grosso do Sul"], ["MT", "Mato Grosso"], ["PA", "Para"], ["PB", "Paraiba"], ["PE", "Pernambuco"], ["PI", "Piaui"], ["PR", "Parana"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RO", "Rondonia"], ["RR", "Roraima"], ["RS", "Rio Grande do Sul"], ["SC", "Santa Catarina"], ["SE", "Sergipe"], ["SP", "Sao Paulo"], ["TO", "Tocantins"]] }, "CF": { "label": "Region", "list": [["AC", "Ouham"], ["BB", "Bamingui-Bangoran"], ["BGF", "Bangui"], ["BK", "Basse-Kotto"], ["HK", "Haute-Kotto"], ["HM", "Haut-Mbomou"], ["HS", "Mambere-Kadei"], ["KG", "Kemo"], ["LB", "Lobaye"], ["MB", "Mbomou"], ["MP", "Ombella-Mpoko"], ["NM", "Nana-Mambere"], ["OP", "Ouham-Pende"], ["SE", "Sangha-Mbaere"], ["UK", "Ouaka"]] }, "CA": { "label": "Province", "list": [["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"], ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon Territory"]] }, "CH": { "label": "Region", "list": [["AG", "Aargau"], ["AI", "Appenzell Innerrhoden"], ["AR", "Appenzell Ausserrhoden"], ["BE", "Bern"], ["BL", "Basel-Landschaft"], ["BS", "Basel-Stadt"], ["FR", "Freiburg"], ["GE", "Gen\xE8ve"], ["GL", "Glarus"], ["GR", "Grigioni"], ["JU", "Jura"], ["LU", "Luzern"], ["NE", "Neuch\xE2tel"], ["NW", "Nidwalden"], ["OW", "Obwalden"], ["SG", "Sankt Gallen"], ["SH", "Schaffhausen"], ["SO", "Solothurn"], ["SZ", "Schwyz"], ["TG", "Thurgau"], ["TI", "Ticino"], ["UR", "Uri"], ["VD", "Vaud"], ["VS", "Valais"], ["ZG", "Zug"], ["ZH", "Z\xFCrich"]] }, "CL": { "label": "Region", "list": [["AI", "Ais\xE9n del General Carlos Ib\xE1\xF1ez del Campo"], ["AN", "Antofagasta"], ["AP", "Arica y Parinacota"], ["AR", "Araucan\xEDa"], ["AT", "Atacama"], ["BI", "B\xEDo-B\xEDo"], ["CO", "Coquimbo"], ["LI", "Libertador General Bernardo O'Higgins"], ["LL", "Los Lagos"], ["LR", "Los R\xEDos"], ["MA", "Magallanes"], ["ML", "Maule"], ["NB", "Nuble"], ["RM", "Regi\xF3n Metropolitana de Santiago"], ["TA", "Tarapac\xE1"], ["VS", "Valpara\xEDso"]] }, "CN": { "label": "Region", "list": [["11", "Beijing"], ["12", "Tianjin"], ["13", "Hebei"], ["14", "Shanxi"], ["15", "Nei Mongol"], ["21", "Liaoning"], ["22", "Jilin"], ["23", "Heilongjiang"], ["31", "Shanghai"], ["32", "Jiangsu"], ["33", "Zhejiang"], ["34", "Anhui"], ["35", "Fujian"], ["36", "Jiangxi"], ["37", "Shandong"], ["41", "Henan"], ["42", "Hubei"], ["43", "Hunan"], ["44", "Guangdong"], ["45", "Guangxi"], ["46", "Hainan"], ["50", "Chongqing"], ["51", "Sichuan"], ["52", "Guizhou"], ["53", "Yunnan"], ["54", "Xizang"], ["61", "Shaanxi"], ["62", "Gansu"], ["63", "Qinghai"], ["64", "Ningxia"], ["65", "Xinjiang"]] }, "CI": { "label": "Region", "list": [["01", "Lagunes"], ["02", "Haut-Sassandra"], ["03", "Savanes"], ["04", "Vallee Du Bandama"], ["05", "Moyen-Comoe"], ["07", "Lacs"], ["08", "Zanzan"], ["09", "Bas-Sassandra"], ["10", "Denguele"], ["11", "N'zi-Comoe"], ["12", "Marahoue"], ["13", "Sud-Comoe"], ["14", "Worodougou"], ["15", "Sud-Bandama"], ["16", "Agneby"], ["17", "Bafing"], ["18", "Fromager"], ["19", "Moyen-Cavally"]] }, "CO": { "label": "Region", "list": [["AMA", "Amazonas"], ["ANT", "Antioquia"], ["ARA", "Arauca"], ["ATL", "Atl\xE1ntico"], ["BOL", "Bol\xEDvar"], ["BOY", "Boyac\xE1"], ["CAL", "Caldas"], ["CAQ", "Caquet\xE1"], ["CAS", "Casanare"], ["CAU", "Cauca"], ["CES", "Cesar"], ["CHO", "Choc\xF3"], ["COR", "C\xF3rdoba"], ["CUN", "Cundinamarca"], ["DC", "Distrito Capital de Bogot\xE1"], ["GUA", "Guain\xEDa"], ["GUV", "Guaviare"], ["HUI", "Huila"], ["LAG", "La Guajira"], ["MAG", "Magdalena"], ["MET", "Meta"], ["NAR", "Nari\xF1o"], ["NSA", "Norte de Santander"], ["PUT", "Putumayo"], ["QUI", "Quind\xEDo"], ["RIS", "Risaralda"], ["SAN", "Santander"], ["SAP", "San Andr\xE9s, Providencia y Santa Catalina"], ["SUC", "Sucre"], ["TOL", "Tolima"], ["VAC", "Valle del Cauca"], ["VAU", "Vaup\xE9s"], ["VID", "Vichada"]] }, "CR": { "label": "Region", "list": [["A", "Alajuela"], ["C", "Cartago"], ["G", "Guanacaste"], ["H", "Heredia"], ["L", "Lim\xF3n"], ["P", "Puntarenas"], ["SJ", "San Jos\xE9"]] }, "CY": { "label": "Region", "list": [["04", "Famagusta"], ["06", "Kyrenia"], ["03", "Larnaca"], ["01", "Nicosia"], ["02", "Limassol"], ["05", "Paphos"]] }, "CZ": { "label": "Region", "list": [["JC", "Jiho\u010Desk\xFD kraj"], ["JM", "Jihomoravsk\xFD kraj"], ["KA", "Karlovarsk\xFD kraj"], ["KR", "Kr\xE1lov\xE9hradeck\xFD kraj"], ["LI", "Libereck\xFD kraj"], ["MO", "Moravskoslezsk\xFD kraj"], ["OL", "Olomouck\xFD kraj"], ["PA", "Pardubick\xFD kraj"], ["PL", "Plze\u0148sk\xFD kraj"], ["PR", "Praha, hlavn\xED m\u011Bsto"], ["ST", "St\u0159edo\u010Desk\xFD kraj"], ["US", "\xDAsteck\xFD kraj"], ["VY", "Vyso\u010Dina"], ["ZL", "Zl\xEDnsk\xFD kraj"]] }, "DE": { "label": "State", "list": [["BB", "Brandenburg"], ["BE", "Berlin"], ["BW", "Baden-W\xFCrttemberg"], ["BY", "Bayern"], ["HB", "Bremen"], ["HE", "Hessen"], ["HH", "Hamburg"], ["MV", "Mecklenburg-Vorpommern"], ["NI", "Niedersachsen"], ["NW", "Nordrhein-Westfalen"], ["RP", "Rheinland-Pfalz"], ["SH", "Schleswig-Holstein"], ["SL", "Saarland"], ["SN", "Sachsen"], ["ST", "Sachsen-Anhalt"], ["TH", "Th\xFCringen"]] }, "DK": { "label": "Region", "list": [["81", "Nordjylland"], ["82", "Midtjylland"], ["83", "Syddanmark"], ["84", "Hovedstaden"], ["85", "Sj\xE6lland"]] }, "DO": { "label": "Region", "list": [["01", "Distrito Nacional"], ["02", "Azua"], ["03", "Baoruco"], ["04", "Barahona"], ["05", "Dajabon"], ["06", "Duarte"], ["07", "Elias Pina"], ["08", "El Seibo"], ["09", "Espaillat"], ["10", "Independencia"], ["11", "La Altagracia"], ["12", "La Romana"], ["13", "La Vega"], ["14", "Maria Trinidad Sanchez"], ["15", "Monte Cristi"], ["16", "Pedernales"], ["17", "Peravia"], ["18", "Puerto Plata"], ["19", "Salcedo"], ["20", "Samana"], ["21", "San Cristobal"], ["22", "San Juan"], ["23", "San Pedro De Macoris"], ["24", "Sanchez Ramirez"], ["25", "Santiago"], ["26", "Santiago Rodriguez"], ["27", "Valverde"], ["28", "Monsenor Nouel"], ["29", "Monte Plata"], ["30", "Hato Mayor"]] }, "EG": { "label": "Region", "list": [["DK", "Dakahlia"], ["BA", "Red Sea"], ["BH", "Beheira"], ["FYM", "Faiyum"], ["GH", "Gharbia"], ["ALX", "Alexandria"], ["IS", "Ismailia"], ["GZ", "Giza"], ["MNF", "Monufia"], ["MN", "Minya"], ["C", "Cairo"], ["KB", "Qalyubia"], ["LX", "Luxor"], ["WAD", "New Valley"], ["SUZ", "Suez"], ["SHR", "Sharqia"], ["ASN", "Aswan"], ["AST", "Asyut"], ["BNS", "Beni Suef"], ["PTS", "Port Said"], ["DT", "Damietta"], ["JS", "South Sinai"], ["KFS", "Kafr El Sheikh"], ["MT", "Matruh"], ["KN", "Qena"], ["SIN", "North Sinai"], ["SHG", "Sohag"]] }, "ES": { "label": "Region", "list": [["AN", "Andaluc\xEDa"], ["AR", "Arag\xF3n"], ["AS", "Asturias, Principado de"], ["CB", "Cantabria"], ["CE", "Ceuta"], ["CL", "Castilla y Le\xF3n"], ["CM", "Castilla-La Mancha"], ["CN", "Canarias"], ["CT", "Catalu\xF1a"], ["EX", "Extremadura"], ["GA", "Galicia"], ["IB", "Islas Baleares"], ["MC", "Murcia, Regi\xF3n de"], ["MD", "Madrid, Comunidad de"], ["ML", "Melilla"], ["NC", "Navarra"], ["PV", "Pais Vasco"], ["RI", "La Rioja"], ["VC", "Comunidad Valenciana"]] }, "FR": { "label": "Region", "list": [["ARA", "Auvergne-Rh\xF4ne-Alpes"], ["BFC", "Bourgogne-Franche-Comt\xE9"], ["BRE", "Bretagne"], ["CVL", "Centre-Val de Loire"], ["20R", "Corse"], ["GES", "Grand-Est"], ["HDF", "Hauts-de-France"], ["IDF", "\xCEle-de-France"], ["NOR", "Normandie"], ["NAQ", "Nouvelle-Aquitaine"], ["OCC", "Occitanie"], ["PDL", "Pays-de-la-Loire"], ["PAC", "Provence-Alpes-C\xF4te-d\u2019Azur"], ["A", "Alsace"], ["B", "Aquitaine"], ["BL", "Saint-Barth\xE9lemy"], ["C", "Auvergne"], ["D", "Bourgogne"], ["E", "Bretagne"], ["F", "Centre"], ["G", "Champagne-Ardenne"], ["H", "Corse"], ["I", "Franche-Comt\xE9"], ["J", "Ile-de-France"], ["K", "Languedoc-Roussillon"], ["L", "Limousin"], ["M", "Lorraine"], ["N", "Midi-Pyr\xE9n\xE9es"], ["O", "Nord-Pas-de-Calais"], ["P", "Basse-Normandie"], ["Q", "Haute-Normandie"], ["R", "Pays-de-la-Loire"], ["RE", "La R\xE9union"], ["S", "Picardie"], ["T", "Poitou-Charentes"], ["TF", "Terres australes fran\xE7aises"], ["U", "Provence-Alpes-C\xF4te-d'Azur"], ["V", "Rh\xF4ne-Alpes"]] }, "GB": { "label": "Region", "list": [["ENG", "England"], ["NIR", "Northern Ireland"], ["SCT", "Scotland"], ["WLS", "Wales"]] }, "GR": { "label": "Region", "list": [["01", "Aitolia Kai Akarnania"], ["03", "Voiotia"], ["04", "Evvoia"], ["05", "Evritania"], ["06", "Fthiotis"], ["07", "Fokis"], ["11", "Argolis"], ["12", "Arkadhia"], ["13", "Akhaia"], ["14", "Ilia"], ["15", "Korinthia"], ["16", "Lakonia"], ["17", "Messinia"], ["21", "Zakinthos"], ["22", "Kerkira"], ["23", "Kefallinia"], ["31", "Arta"], ["32", "Thesprotia"], ["33", "Ioannina"], ["34", "Preveza"], ["41", "Kardhitsa"], ["42", "Larisa"], ["43", "Magnisia"], ["44", "Trikala"], ["51", "Grevena"], ["52", "Drama"], ["53", "Imathia"], ["54", "Thessaloniki"], ["55", "Kavala"], ["56", "Kastoria"], ["57", "Kilkis"], ["58", "Kozani"], ["59", "Pella"], ["61", "Pieria"], ["62", "Serrai"], ["63", "Florina"], ["71", "Evros"], ["72", "Xanthi"], ["73", "Rodhopi"], ["81", "Dhodhekanisos"], ["82", "Kikladhes"], ["83", "Lesvos"], ["84", "Samos"], ["91", "Iraklion"], ["92", "Lasithi"], ["93", "Rethimni"], ["94", "Chios"], ["95", "Chania"], ["96", "Icaria"], ["97", "Psara"], ["98", "Lemnos"], ["A1", "Attiki"]] }, "HR": { "label": "Region", "list": [["01", "Zagrebacka"], ["02", "Krapinsko-Zagorska"], ["03", "Sisacko-Moslavacka"], ["04", "Karlovacka"], ["05", "Varazdinska"], ["06", "Koprivnicko-Krizevacka"], ["07", "Bjelovarsko-Bilogorska"], ["08", "Primorsko-Goranska"], ["09", "Licko-Senjska"], ["10", "Viroviticko-Podravska"], ["11", "Pozesko-Slavonska"], ["12", "Brodsko-Posavska"], ["13", "Zadarska"], ["14", "Osjecko-Baranjska"], ["15", "Sibensko-Kninska"], ["16", "Vukovarsko-Srijemska"], ["17", "Splitsko-Dalmatinska"], ["18", "Istarska"], ["19", "Dubrovacko-Neretvanska"], ["20", "Medimurska"], ["21", "Grad Zagreb"]] }, "HU": { "label": "Region", "list": [["BA", "Baranya"], ["BE", "Bekes"], ["BK", "Bacs-Kiskun"], ["BU", "Budapest"], ["BZ", "Borsod-Abauj-Zemplen"], ["CS", "Csongrad"], ["FE", "Fejer"], ["GS", "Gyor-Moson-Sopron"], ["HB", "Hajdu-Bihar"], ["HE", "Heves"], ["JN", "Jasz-Nagykun-Szolnok"], ["KE", "Komarom-Esztergom"], ["NO", "Nograd"], ["PE", "Pest"], ["SO", "Somogy"], ["SZ", "Szabolcs-Szatmar-Bereg"], ["TO", "Tolna"], ["VA", "Vas"], ["VE", "Veszprem"], ["ZA", "Zala"]] }, "ID": { "label": "Province", "list": [["AC", "Aceh"], ["BA", "Bali"], ["BB", "Bangka Belitung Islands"], ["BT", "Banten"], ["BE", "Bengkulu"], ["GO", "Gorontalo"], ["JA", "Jambi"], ["JB", "West Java"], ["JT", "Central Java"], ["JI", "East Java"], ["KB", "West Kalimantan"], ["KS", "South Kalimantan"], ["KT", "Central Kalimantan"], ["KI", "East Kalimantan"], ["KU", "North Kalimantan"], ["KR", "Riau Islands"], ["LA", "Lampung"], ["MA", "Maluku"], ["MU", "North Maluku"], ["NB", "West Nusa Tenggara"], ["NT", "East Nusa Tenggara"], ["PA", "Papua"], ["PB", "West Papua"], ["RI", "Riau"], ["SR", "West Sulawesi"], ["SN", "South Sulawesi"], ["ST", "Central Sulawesi"], ["SG", "South East Sulawesi"], ["SA", "North Sulawesi"], ["SB", "West Sumatra"], ["SS", "South Sumatra"], ["SU", "North Sumatra"], ["JK", "Jakarta Special Capital Region"], ["YO", "Special Region of Yogyakarta"]] }, "IN": { "label": "Region", "list": [["AN", "Andaman and Nicobar Islands"], ["AP", "Andhra Pradesh"], ["AR", "Arunachal Pradesh"], ["AS", "Assam"], ["BR", "Bihar"], ["CT", "Chhattisgarh"], ["CH", "Chandigarh"], ["DD", "Daman and Diu"], ["DL", "Delhi"], ["DN", "Dadra and Nagar Haveli"], ["GA", "Goa"], ["GJ", "Gujarat"], ["HP", "Himachal Pradesh"], ["HR", "Haryana"], ["JH", "Jharkhand"], ["JK", "Jammu and Kashmir"], ["KA", "Karnataka"], ["KL", "Kerala"], ["LA", "Ladakh"], ["LD", "Lakshadweep"], ["MH", "Maharashtra"], ["ML", "Meghalaya"], ["MN", "Manipur"], ["MP", "Madhya Pradesh"], ["MZ", "Mizoram"], ["NL", "Nagaland"], ["OR", "Odisha"], ["PB", "Punjab"], ["PY", "Puducherry"], ["RJ", "Rajasthan"], ["SK", "Sikkim"], ["TG", "Telangana"], ["TN", "Tamil Nadu"], ["TR", "Tripura"], ["UP", "Uttar Pradesh"], ["UT", "Uttarakhand"], ["WB", "West Bengal"]] }, "IE": { "label": "Region", "list": [["CE", "Clare"], ["CN", "Cavan"], ["CO", "Cork"], ["CW", "Carlow"], ["D", "Dublin"], ["DL", "Donegal"], ["G", "Galway"], ["KE", "Kildare"], ["KK", "Kilkenny"], ["KY", "Kerry"], ["LD", "Longford"], ["LH", "Louth"], ["LK", "Limerick"], ["LM", "Leitrim"], ["LS", "Laois"], ["MH", "Meath"], ["MN", "Monaghan"], ["MO", "Mayo"], ["OY", "Offaly"], ["RN", "Roscommon"], ["SO", "Sligo"], ["TA", "Tipperary"], ["WD", "Waterford"], ["WH", "Westmeath"], ["WW", "Wicklow"], ["WX", "Wexford"]] }, "IS": { "label": "Region", "list": [["1", "H\xF6fu\xF0borgarsv\xE6\xF0i\xF0"], ["2", "Su\xF0urnes"], ["3", "Vesturland"], ["4", "Vestfir\xF0ir"], ["5", "Nor\xF0urland vestra"], ["6", "Nor\xF0urland eystra"], ["7", "Austurland"], ["8", "Su\xF0urland"]] }, "IT": { "label": "Region", "list": [["21", "Piemonte"], ["23", "Valle d'Aosta"], ["25", "Lombardia"], ["32", "Trentino-S\xFCdtirol"], ["34", "Veneto"], ["36", "Friuli-Venezia Giulia"], ["42", "Liguria"], ["45", "Emilia-Romagna"], ["52", "Toscana"], ["55", "Umbria"], ["57", "Marche"], ["62", "Lazio"], ["65", "Abruzzo"], ["67", "Molise"], ["72", "Campania"], ["75", "Puglia"], ["77", "Basilicata"], ["78", "Calabria"], ["82", "Sicilia"], ["88", "Sardegna"]] }, "JP": { "label": "Region", "list": [["01", "Hokkaido"], ["02", "Aomori"], ["03", "Iwate"], ["04", "Miyagi"], ["05", "Akita"], ["06", "Yamagata"], ["07", "Fukushima"], ["08", "Ibaraki"], ["09", "Tochigi"], ["10", "Gumma"], ["11", "Saitama"], ["12", "Chiba"], ["13", "Tokyo"], ["14", "Kanagawa"], ["15", "Niigata"], ["16", "Toyama"], ["17", "Ishikawa"], ["18", "Fukui"], ["19", "Yamanashi"], ["20", "Nagano"], ["21", "Gifu"], ["22", "Shizuoka"], ["23", "Aichi"], ["24", "Mie"], ["25", "Shiga"], ["26", "Kyoto"], ["27", "Osaka"], ["28", "Hyogo"], ["29", "Nara"], ["30", "Wakayama"], ["31", "Tottori"], ["32", "Shimane"], ["33", "Okayama"], ["34", "Hiroshima"], ["35", "Yamaguchi"], ["36", "Tokushima"], ["37", "Kagawa"], ["38", "Ehime"], ["39", "Kouchi"], ["40", "Fukuoka"], ["41", "Saga"], ["42", "Nagasaki"], ["43", "Kumamoto"], ["44", "Oita"], ["45", "Miyazaki"], ["46", "Kagoshima"], ["47", "Okinawa"]] }, "KR": { "label": "Region", "list": [["11", "Seoul"], ["26", "Busan"], ["27", "Daegu"], ["28", "Incheon"], ["29", "Gwangju"], ["30", "Daejeon"], ["31", "Ulsan"], ["41", "Gyeonggi-do"], ["42", "Gangwon-do"], ["43", "Chungcheongbuk-do"], ["44", "Chungcheongnam-do"], ["45", "Jeollabuk-do"], ["46", "Jeollanam-do"], ["47", "Gyeongsangbuk-do"], ["48", "Gyeongsangnam-do"], ["49", "Jeju-do"]] }, "MX": { "label": "Region", "list": [["AGU", "Aguascalientes"], ["BCN", "Baja California"], ["BCS", "Baja California Sur"], ["CAM", "Campeche"], ["CHH", "Chihuahua"], ["CHP", "Chiapas"], ["COA", "Coahuila"], ["COL", "Colima"], ["DIF", "Ciudad de Mexico"], ["DUR", "Durango"], ["GRO", "Guerrero"], ["GUA", "Guanajuato"], ["HID", "Hidalgo"], ["JAL", "Jalisco"], ["MEX", "Mexico"], ["MIC", "Michoacan"], ["MOR", "Morelos"], ["NAY", "Nayarit"], ["NLE", "Nuevo Leon"], ["OAX", "Oaxaca"], ["PUE", "Puebla"], ["QUE", "Queretaro"], ["ROO", "Quintana Roo"], ["SIN", "Sinaloa"], ["SLP", "San Luis Potosi"], ["SON", "Sonora"], ["TAB", "Tabasco"], ["TAM", "Tamaulipas"], ["TLA", "Tlaxcala"], ["VER", "Veracruz"], ["YUC", "Yucatan"], ["ZAC", "Zacatecas"]] }, "MH": { "label": "Region", "list": [["ALK", "Ailuk Atoll"], ["ALL", "Ailinglaplap Atoll"], ["ARN", "Arno Atoll"], ["AUR", "Aur Atoll"], ["EBO", "Ebon Atoll"], ["ENI", "Enewetak Atoll"], ["JAB", "Jabat Island"], ["JAL", "Jaluit Atoll"], ["KIL", "Kili Island"], ["KWA", "Kwajalein Atoll"], ["LAE", "Lae Atoll"], ["LIB", "Lib Island"], ["LIK", "Likiep Atoll"], ["MAJ", "Majuro Atoll"], ["MAL", "Maloelap Atoll"], ["MEJ", "Mejit Island"], ["MIL", "Mili Atoll"], ["NMK", "Namdrik Atoll"], ["NMU", "Namu Atoll"], ["RON", "Rongelap Atoll"], ["UJA", "Ujae Atoll"], ["UTI", "Utrik Atoll"], ["WTH", "Wotho Atoll"], ["WTJ", "Wotje Atoll"]] }, "MY": { "label": "Region", "list": [["1", "Johor"], ["10", "Selangor"], ["11", "Terengganu"], ["12", "Sabah"], ["13", "Sarawak"], ["14", "Wilayah Persekutuan Kuala Lumpur"], ["15", "Wilayah Persekutuan Labuan"], ["16", "Wilayah Persekutuan Putrajaya"], ["2", "Kedah"], ["3", "Kelantan"], ["4", "Melaka"], ["5", "Negeri Sembilan"], ["6", "Pahang"], ["7", "Pulau Pinang"], ["8", "Perak"], ["9", "Perlis"]] }, "NG": { "label": "State", "list": [["FC", "Abuja Federal Capital Territory"], ["AB", "Abia"], ["AD", "Adamawa"], ["AK", "Akwa Ibom"], ["AN", "Anambra"], ["BA", "Bauchi"], ["BY", "Bayelsa"], ["BE", "Benue"], ["BO", "Borno"], ["CR", "Cross River"], ["DE", "Delta"], ["EB", "Ebonyi"], ["ED", "Edo"], ["EK", "Ekiti"], ["EN", "Enugu"], ["GO", "Gombe"], ["IM", "Imo"], ["JI", "Jigawa"], ["KD", "Kaduna"], ["KN", "Kano"], ["KT", "Katsina"], ["KE", "Kebbi"], ["KO", "Kogi"], ["KW", "Kwara"], ["LA", "Lagos"], ["NA", "Nasarawa"], ["NI", "Niger"], ["OG", "Ogun"], ["ON", "Ondo"], ["OS", "Osun"], ["OY", "Oyo"], ["PL", "Plateau"], ["RI", "Rivers"], ["SO", "Sokoto"], ["TA", "Taraba"], ["YO", "Yobe"], ["ZA", "Zamfara"]] }, "NL": { "label": "Region", "list": [["CW", "Cura\xE7ao"], ["DR", "Drenthe"], ["FL", "Flevoland"], ["FR", "Frysl\xE2n"], ["GE", "Gelderland"], ["GR", "Groningen"], ["LI", "Limburg"], ["NB", "Noord-Brabant"], ["NH", "Noord-Holland"], ["OV", "Overijssel"], ["SX", "Sint Maarten"], ["UT", "Utrecht"], ["ZE", "Zeeland"], ["ZH", "Zuid-Holland"]] }, "NO": { "label": "Region", "list": [["01", "\xD8stfold"], ["02", "Akershus"], ["03", "Oslo"], ["04", "Hedmark"], ["05", "Oppland"], ["06", "Buskerud"], ["07", "Vestfold"], ["08", "Telemark"], ["09", "Aust-Agder"], ["10", "Vest-Agder"], ["11", "Rogaland"], ["12", "Hordaland"], ["14", "Sogn og Fjordane"], ["15", "M\xF8re og Romsdal"], ["16", "S\xF8r-Tr\xF8ndelag"], ["17", "Nord-Tr\xF8ndelag"], ["18", "Nordland"], ["19", "Troms"], ["20", "Finnmark"]] }, "NZ": { "label": "Region", "list": [["AUK", "Auckland"], ["BOP", "Bay Of Plenty"], ["CAN", "Canterbury"], ["CIT", "Chatham Islands Territory"], ["GIS", "Gisborne"], ["HKB", "Hawke's Bay"], ["MBH", "Marlborough"], ["MWT", "Manawatu-Wanganui"], ["NSN", "Nelson"], ["NTL", "Northland"], ["OTA", "Otago"], ["STL", "Southland"], ["TAS", "Tasman"], ["TKI", "Taranaki"], ["WGN", "Wellington"], ["WKO", "Waikato"], ["WTC", "West Coast"]] }, "PK": { "label": "Region", "list": [["BA", "Balochistan"], ["IS", "Islamabad"], ["JK", "Azad Kashmir"], ["PB", "Punjab"], ["SD", "Sindh"], ["KP", "Khyber Pakhtunkhwa"], ["GB", "Gilgit Baltistan"]] }, "PA": { "label": "Province", "list": [["1", "Bocas del Toro"], ["4", "Chiriqu\xED"], ["2", "Cocl\xE9"], ["3", "Col\xF3n"], ["5", "Dari\xE9n"], ["EM", "Ember\xE1"], ["KY", "Guna Yala"], ["6", "Herrera"], ["7", "Los Santos"], ["NB", "Ng\xE4be-Bugl\xE9"], ["8", "Panam\xE1"], ["10", "Panam\xE1 Oeste"], ["9", "Veraguas"]] }, "PE": { "label": "Region", "list": [["AMA", "Amazonas"], ["ANC", "Ancash"], ["APU", "Apurimac"], ["ARE", "Arequipa"], ["AYA", "Ayacucho"], ["CAJ", "Cajamarca"], ["CAL", "Callao"], ["CUS", "Cusco"], ["HUV", "Huancavelica"], ["HUC", "Huanuco"], ["ICA", "Ica"], ["JUN", "Junin"], ["LAL", "La Libertad"], ["LAM", "Lambayeque"], ["LIM", "Lima"], ["LOR", "Loreto"], ["MDD", "Madre De Dios"], ["MOQ", "Moquegua"], ["PAS", "Pasco"], ["PIU", "Piura"], ["PUN", "Puno"], ["SAM", "San Martin"], ["TAC", "Tacna"], ["TUM", "Tumbes"], ["UCA", "Ucayali"]] }, "PH": { "label": "Region", "list": [["01", "Ilocos Region"], ["02", "Cagayan Valley "], ["03", "Central Luzon"], ["05", "Bicol Region"], ["06", "Western Visayas"], ["07", "Central Visayas"], ["08", "Eastern Visayas"], ["09", "Zamboanga Peninsula"], ["10", "Northern Mindanao"], ["11", "Davao Region "], ["12", "SOCCSKSARGEN "], ["13", "Caraga "], ["14", "Autonomous Region in Muslim Mindanao "], ["40", "CALABARZON "], ["41", "MIMAROPA "], ["CAR", "Cordillera Administrative Region "], ["NCR", "National Capital Region"]] }, "PL": { "label": "Region", "list": [["DS", "Dolno\u015Bl\u0105skie"], ["KP", "Kujawsko-pomorskie"], ["LB", "Lubuskie"], ["LD", "\u0141\xF3dzkie"], ["LU", "Lubelskie"], ["MA", "Ma\u0142opolskie"], ["MZ", "Mazowieckie"], ["OP", "Opolskie"], ["PD", "Podlaskie"], ["PK", "Podkarpackie"], ["PM", "Pomorskie"], ["SK", "\u015Awi\u0119tokrzyskie"], ["SL", "\u015Al\u0105skie"], ["WN", "Warmi\u0144sko-mazurskie"], ["WP", "Wielkopolskie"], ["ZP", "Zachodniopomorskie"]] }, "PT": { "label": "Region", "list": [["01", "Aveiro"], ["02", "Beja"], ["03", "Braga"], ["04", "Bragan\xE7a"], ["05", "Castelo Branco"], ["06", "Coimbra"], ["07", "\xC9vora"], ["08", "Faro"], ["09", "Guarda"], ["10", "Leiria"], ["11", "Lisboa"], ["12", "Portalegre"], ["13", "Porto"], ["14", "Santar\xE9m"], ["15", "Set\xFAbal"], ["16", "Viana do Castelo"], ["17", "Vila Real"], ["18", "Viseu"], ["20", "Regi\xE3o Aut\xF3noma dos A\xE7ores"], ["30", "Regi\xE3o Aut\xF3noma da Madeira"]] }, "PY": { "label": "Region", "list": [["1", "Concepcion"], ["10", "Alto Parana"], ["11", "Central"], ["12", "Neembucu"], ["13", "Amambay"], ["14", "Canindeyu"], ["15", "Presidente Hayes"], ["16", "Alto Paraguay"], ["19", "Boqueron"], ["2", "San Pedro"], ["3", "Cordillera"], ["4", "Guaira"], ["5", "Caaguazu"], ["6", "Caazapa"], ["7", "Itapua"], ["8", "Misiones"], ["9", "Paraguari"], ["ASU", "Asuncion"]] }, "RO": { "label": "County", "list": [["AB", "Alba"], ["AR", "Arad"], ["AG", "Arge\u0219"], ["BC", "Bac\u0103u"], ["BH", "Bihor"], ["BN", "Bistri\u021Ba-N\u0103s\u0103ud"], ["BT", "Boto\u0219ani"], ["BV", "Bra\u0219ov"], ["BR", "Br\u0103ila"], ["BZ", "Buz\u0103u"], ["CS", "Cara\u0219-Severin"], ["CL", "C\u0103l\u0103ra\u0219i"], ["CJ", "Cluj"], ["CT", "Constan\u021Ba"], ["CV", "Covasna"], ["DB", "D\xE2mbovi\u021Ba"], ["DJ", "Dolj"], ["GL", "Gala\u021Bi"], ["GR", "Giurgiu"], ["GJ", "Gorj"], ["HR", "Harghita"], ["HD", "Hunedoara"], ["IL", "Ialomi\u021Ba"], ["IS", "Ia\u0219i"], ["IF", "Ilfov"], ["MM", "Maramure\u0219"], ["MH", "Mehedin\u021Bi"], ["MS", "Mure\u0219"], ["NT", "Neam\u021B"], ["OT", "Olt"], ["PH", "Prahova"], ["SM", "Satu Mare"], ["SJ", "S\u0103laj"], ["SB", "Sibiu"], ["SV", "Suceava"], ["TR", "Teleorman"], ["TM", "Timi\u0219"], ["TL", "Tulcea"], ["VS", "Vaslui"], ["VL", "V\xE2lcea"], ["VN", "Vrancea"], ["B", "Bucharest"]] }, "RU": { "label": "Oblast", "list": [["AD", "Adygeya, Respublika"], ["AL", "Altay"], ["ALT", "Altayskiy Kray"], ["AMU", "Amurskaya oblast'"], ["ARK", "Arkhangel'skaya oblast'"], ["AST", "Astrakhanskaya oblast'"], ["BA", "Bashkortostan, Respublika"], ["BEL", "Belgorodskaya oblast'"], ["BRY", "Bryanskaya oblast'"], ["BU", "Buryatiya, Respublika"], ["CE", "Chechenskaya Respublika"], ["CHE", "Cheljabinskaya oblast'"], ["CHU", "Chukotskiy avtonomnyy okrug"], ["CU", "Chuvashskaya Respublika"], ["DA", "Dagestan, Respublika"], ["DVD", "Kamchatka"], ["IN", "Ingushetiya, Respublika"], ["IRK", "Irkutskaya oblast'"], ["IVA", "Ivanovskaya oblast'"], ["KB", "Kabardino-Balkarskaya Respublika"], ["KC", "Karachayevo-Cherkesskaya Respublika"], ["KDA", "Krasnodarskiy kray"], ["KEM", "Kemerovskaya oblast'"], ["KGD", "Kaliningradskaya oblast'"], ["KGN", "Kurganskaya oblast'"], ["KHA", "Khabarovskiy kray"], ["KHM", "Khanty-Mansiyskiy avtonomnyy okrug"], ["KIR", "Kirovskaya oblast'"], ["KK", "Hakasiya, Respublika"], ["KL", "Kalmykiya, Respublika"], ["KLU", "Kaluzhskaya oblast'"], ["KO", "Komi, Respublika"], ["KOS", "Kostromskaya oblast'"], ["KR", "Kareliya, Respublika"], ["KRS", "Kurskaya oblast'"], ["KYA", "Krasnojarskiy kray"], ["LEN", "Leningradskaya oblast'"], ["LIP", "Lipeckaya oblast'"], ["MAG", "Magadanskaya oblast'"], ["ME", "Mariy El, Respublika"], ["MO", "Mordoviya, Respublika"], ["MOS", "Moskovskaya oblast'"], ["MOW", "Moscow"], ["MUR", "Murmanskaya oblast'"], ["NEN", "Nenetskiy avtonomnyy okrug"], ["NGR", "Novgorodskaya oblast'"], ["NIZ", "Nizhegorodskaya oblast'"], ["NVS", "Novosibirskaya oblast'"], ["OMS", "Omskaya oblast'"], ["ORE", "Orenburgskaya oblast'"], ["ORL", "Orlovskaya oblast'"], ["PER", "Permskiy kray"], ["PNZ", "Penzenskaya oblast'"], ["PRI", "Primorskiy kraj"], ["PSK", "Pskovskaya oblast'"], ["ROS", "Rostovskaya oblast'"], ["RYA", "Ryazanskaya oblast'"], ["SA", "Saha, Respublika"], ["SAK", "Sahalinskaya oblast'"], ["SAM", "Samarskaya oblast'"], ["SAR", "Saratovskaya oblast'"], ["SE", "Severnaya Osetiya, Respublika"], ["SMO", "Smolenskaya oblast'"], ["SPE", "Sankt-Peterburg"], ["STA", "Stavropol'skiy kray"], ["SVE", "Sverdlovskaya oblast'"], ["TA", "Tatarstan, Respublika"], ["TAM", "Tambovskaya oblast'"], ["TOM", "Tomskaya oblast'"], ["TUL", "Tul'skaya oblast'"], ["TVE", "Tverskaya oblast'"], ["TY", "Tyva, Respublika"], ["TYU", "Tyumenskaya oblast'"], ["UD", "Udmurtskaya Respublika"], ["ULY", "Ul'janovskaya oblast'"], ["VGG", "Volgogradskaya oblast'"], ["VLA", "Vladimirskaya oblast'"], ["VLG", "Vologodskaya oblast'"], ["VOR", "Voronezhskaya oblast'"], ["YAN", "Yamalo-Neneckiy avtonomnyy okrug"], ["YAR", "Jaroslavskaya oblast'"], ["YEV", "Yevreyskaya avtonomnaya oblast'"], ["ZAB", "Zabaykal'skiy kray"]] }, "SD": { "label": "Region", "list": [["DN", "North Darfur"], ["DS", "South Darfur"], ["DW", "West Darfur"], ["GD", "Gedarif"], ["GZ", "Gezira"], ["KA", "Kassala"], ["KH", "Khartoum"], ["KN", "North Kordufan"], ["KS", "South Kordufan"], ["NB", "Blue Nile"], ["NO", "Northern"], ["NR", "River Nile"], ["NW", "White Nile"], ["RS", "Red Sea"], ["SI", "Sennar"]] }, "SN": { "label": "Region", "list": [["1", "Dakar"], ["2", "Ziguinchor"], ["3", "Diourbel"], ["4", "Saint-Louis"], ["5", "Tambacounda"], ["6", "Kaolack"], ["7", "Thi\xE8s"], ["8", "Louga"], ["9", "Fatick"], ["10", "Kolda"], ["11", "Matam"], ["12", "Kaffrine"], ["13", "K\xE9dougou"], ["14", "S\xE9dhiou"]] }, "SG": { "label": "Region", "list": [["01", "Central Singapore"], ["02", "North East"], ["03", "North West"], ["04", "South East"], ["05", "South West"]] }, "SB": { "label": "Region", "list": [["CE", "Central"], ["GU", "Guadalcanal"], ["IS", "Isabel"], ["MK", "Makira"], ["ML", "Malaita"], ["WE", "Western"]] }, "RS": { "label": "Region", "list": [["00", "Belgrade"], ["14", "Bor District"], ["11", "Brani\u010Devo District"], ["23", "Jablanica District"], ["06", "South Ba\u010Dka District"], ["04", "South Banat District"], ["09", "Kolubara District"], ["25", "Kosovo District"], ["28", "Kosovska Mitrovica District"], ["29", "Kosovo-Pomoravlje District"], ["08", "Ma\u010Dva District"], ["17", "Moravica District"], ["20", "Ni\u0161ava District"], ["24", "P\u010Dinja District"], ["26", "Pe\u0107 District"], ["22", "Pirot District"], ["10", "Podunavlje District"], ["13", "Pomoravlje District"], ["27", "Prizren District"], ["19", "Rasina District"], ["18", "Ra\u0161ka District"], ["01", "North Ba\u010Dka District"], ["03", "North Banat District"], ["02", "Central Banat District"], ["07", "Srem District"], ["12", "\u0160umadija District"], ["21", "Toplica District"], ["15", "Zaje\u010Dar District"], ["05", "West Ba\u010Dka District"], ["16", "Zlatibor District"]] }, "SK": { "label": "Region", "list": [["BC", "Banska Bystrica"], ["BL", "Bratislava"], ["KI", "Kosice"], ["NI", "Nitra"], ["PV", "Presov"], ["TA", "Trnava"], ["TC", "Trencin"], ["ZI", "Zilina"]] }, "SI": { "label": "Region", "list": [["001", "Ajdovscina"], ["003", "Bled"], ["004", "Bohinj"], ["005", "Borovnica"], ["006", "Bovec"], ["008", "Brezovica"], ["009", "Brezice"], ["011", "Celje"], ["013", "Cerknica"], ["014", "Cerkno"], ["015", "\u010Cren\u0161ovci"], ["017", "\u010Crnomelj"], ["018", "Destrnik"], ["019", "Diva\u010Da"], ["023", "Dom\u017Eale"], ["025", "Dravograd"], ["029", "Gornja Radgona"], ["032", "Grosuplje"], ["034", "Hrastnik"], ["036", "Idrija"], ["037", "Ig"], ["038", "Ilirska Bistrica"], ["039", "Ivan\u010Dna Gorica"], ["040", "Izola-Isola"], ["041", "Jesenice"], ["043", "Kamnik"], ["044", "Kanal ob So\u010Di"], ["045", "Kidri\u010Devo"], ["046", "Kobarid"], ["048", "Ko\u010Devje"], ["050", "Koper-Capodistria"], ["052", "Kranj"], ["053", "Kranjska Gora"], ["054", "Kr\u0161ko"], ["057", "La\u0161ko"], ["058", "Lenart"], ["059", "Lendava"], ["060", "Litija"], ["061", "Ljubljana"], ["063", "Ljutomer"], ["064", "Logatec"], ["070", "Maribor"], ["071", "Medvode"], ["072", "Menge\u0161"], ["073", "Metlika"], ["074", "Me\u017Eica"], ["075", "Miren-Kostanjevica"], ["076", "Mislinja"], ["079", "Mozirje"], ["080", "Murska Sobota"], ["081", "Muta"], ["084", "Nova Gorica"], ["085", "Novo Mesto"], ["086", "Odranci"], ["087", "Ormo\u017E"], ["090", "Piran"], ["091", "Pivka"], ["094", "Postojna"], ["096", "Ptuj"], ["098", "Ra\u010De-Fram"], ["099", "Rade\u010De"], ["100", "Radenci"], ["101", "Radlje Ob Dravi"], ["102", "Radovljica"], ["103", "Ravne na Koro\u0161kem"], ["104", "Ribnica"], ["106", "Roga\u0161ka Slatina"], ["108", "Ru\u0161e"], ["110", "Sevnica"], ["111", "Se\u017Eana"], ["112", "Slovenj Gradec"], ["113", "Slovenska Bistrica"], ["114", "Slovenske Konjice"], ["117", "\u0160en\u010Dur"], ["118", "\u0160entilj"], ["120", "\u0160entjur"], ["122", "\u0160kofja Loka"], ["123", "\u0160kofljica"], ["126", "\u0160o\u0161tanj"], ["127", "\u0160tore"], ["128", "Tolmin"], ["129", "Trbovlje"], ["130", "Trebnje"], ["131", "Tr\u017Ei\u010D"], ["132", "Turni\u0161\u010De"], ["133", "Velenje"], ["136", "Vipava"], ["138", "Vodice"], ["139", "Vojnik"], ["140", "Vrhnika"], ["141", "Vuzenica"], ["142", "Zagorje Ob Savi"], ["144", "Zrece"], ["146", "Zelezniki"], ["147", "Ziri"], ["160", "Ho\u010De-Slivnica"], ["162", "Horjul"], ["167", "Lovrenc Na Pohorju"], ["169", " Miklav\u017E na Dravskem Polju"], ["171", "Oplotnica"], ["173", "Polzela"], ["174", "Prebold"], ["175", "Prevalje"], ["183", "\u0160empeter-Vrtojba"], ["186", "Trzin"], ["190", "Zalec"], ["193", "Zuzemberk"], ["200", "Polj\u010Dane"], ["203", "Stra\u017Ea"], ["208", "Log-Dragomer"]] }, "SE": { "label": "County", "list": [["AB", "Stockholms l\xE4n"], ["AC", "V\xE4sterbottens l\xE4n"], ["BD", "Norrbottens l\xE4n"], ["C", "Uppsala l\xE4n"], ["D", "S\xF6dermanlands l\xE4n"], ["E", "\xD6sterg\xF6tlands l\xE4n"], ["F", "J\xF6nk\xF6pings l\xE4n"], ["G", "Kronobergs l\xE4n"], ["H", "Kalmar l\xE4n"], ["I", "Gotlands l\xE4n"], ["K", "Blekinge l\xE4n"], ["M", "Sk\xE5ne l\xE4n"], ["N", "Hallands l\xE4n"], ["O", "V\xE4stra G\xF6talands l\xE4n"], ["S", "V\xE4rmlands l\xE4n"], ["T", "\xD6rebro l\xE4n"], ["U", "V\xE4stmanlands l\xE4n"], ["W", "Dalarnas l\xE4n"], ["X", "G\xE4vleborgs l\xE4n"], ["Y", "V\xE4sternorrlands l\xE4n"], ["Z", "J\xE4mtlands l\xE4n"]] }, "SZ": { "label": "Region", "list": [["HH", "Hhohho"], ["LU", "Lubombo"], ["MA", "Manzini"], ["SH", "Shiselweni"]] }, "TH": { "label": "Region", "list": [["10", "Bangkok"], ["11", "Samut Prakan"], ["12", "Nonthaburi"], ["13", "Pathum Thani"], ["14", "Phra Nakhon Si Ayutthaya"], ["15", "Ang Thong"], ["16", "Lop Buri"], ["17", "Sing Buri"], ["18", "Chai Nat"], ["19", "Saraburi"], ["20", "Chon Buri"], ["21", "Rayong"], ["22", "Chanthaburi"], ["23", "Trat"], ["24", "Chachoengsao"], ["25", "Prachin Buri"], ["26", "Nakhon Nayok"], ["27", "Sa Kaeo"], ["30", "Nakhon Ratchasima"], ["31", "Buri Ram"], ["32", "Surin"], ["33", "Si Sa Ket"], ["34", "Ubon Ratchathani"], ["35", "Yasothon"], ["36", "Chaiyaphum"], ["37", "Amnat Charoen"], ["38", "Bueng Kan"], ["39", "Nong Bua Lam Phu"], ["40", "Khon Kaen"], ["41", "Udon Thani"], ["42", "Loei"], ["43", "Nong Khai"], ["44", "Maha Sarakham"], ["45", "Roi Et"], ["46", "Kalasin"], ["47", "Sakon Nakhon"], ["48", "Nakhon Phanom"], ["49", "Mukdahan"], ["50", "Chiang Mai"], ["51", "Lamphun"], ["52", "Lampang"], ["53", "Uttaradit"], ["54", "Phrae"], ["55", "Nan"], ["56", "Phayao"], ["57", "Chiang Rai"], ["58", "Mae Hong Son"], ["60", "Nakhon Sawan"], ["61", "Uthai Thani"], ["62", "Kamphaeng Phet"], ["63", "Tak"], ["64", "Sukhothai"], ["65", "Phitsanulok"], ["66", "Phichit"], ["67", "Phetchabun"], ["70", "Ratchaburi"], ["71", "Kanchanaburi"], ["72", "Suphan Buri"], ["73", "Nakhon Pathom"], ["74", "Samut Sakhon"], ["75", "Samut Songkhram"], ["76", "Phetchaburi"], ["77", "Prachuap Khiri Khan"], ["80", "Nakhon Si Thammarat"], ["81", "Krabi"], ["82", "Phangnga"], ["83", "Phuket"], ["84", "Surat Thani"], ["85", "Ranong"], ["86", "Chumphon"], ["90", "Songkhla"], ["91", "Satun"], ["92", "Trang"], ["93", "Phatthalung"], ["94", "Pattani"], ["95", "Yala"], ["96", "Narathiwat"]] }, "TR": { "label": "Province", "list": [["01", "Adana"], ["02", "Ad\u0131yaman"], ["03", "Afyonkarahisar"], ["04", "A\u011Fr\u0131"], ["05", "Amasya"], ["06", "Ankara"], ["07", "Antalya"], ["08", "Artvin"], ["09", "Ayd\u0131n"], ["10", "Bal\u0131kesir"], ["11", "Bilecik"], ["12", "Bing\xF6l"], ["13", "Bitlis"], ["14", "Bolu"], ["15", "Burdur"], ["16", "Bursa"], ["17", "\xC7anakkale"], ["18", "\xC7ank\u0131r\u0131"], ["19", "\xC7orum"], ["20", "Denizli"], ["21", "Diyarbak\u0131r"], ["22", "Edirne"], ["23", "Elaz\u0131\u011F"], ["24", "Erzincan"], ["25", "Erzurum"], ["26", "Eski\u015Fehir"], ["27", "Gaziantep"], ["28", "Giresun"], ["29", "G\xFCm\xFC\u015Fhane"], ["30", "Hakk\xE2ri"], ["31", "Hatay"], ["32", "Isparta"], ["33", "Mersin"], ["34", "\u0130stanbul"], ["35", "\u0130zmir"], ["36", "Kars"], ["37", "Kastamonu"], ["38", "Kayseri"], ["39", "K\u0131rklareli"], ["40", "K\u0131r\u015Fehir"], ["41", "Kocaeli"], ["42", "Konya"], ["43", "K\xFCtahya"], ["44", "Malatya"], ["45", "Manisa"], ["46", "Kahramanmara\u015F"], ["47", "Mardin"], ["48", "Mu\u011Fla"], ["49", "Mu\u015F"], ["50", "Nev\u015Fehir"], ["51", "Ni\u011Fde"], ["52", "Ordu"], ["53", "Rize"], ["54", "Sakarya"], ["55", "Samsun"], ["56", "Siirt"], ["57", "Sinop"], ["58", "Sivas"], ["59", "Tekirda\u011F"], ["60", "Tokat"], ["61", "Trabzon"], ["62", "Tunceli"], ["63", "\u015Eanl\u0131urfa"], ["64", "U\u015Fak"], ["65", "Van"], ["66", "Yozgat"], ["67", "Zonguldak"], ["68", "Aksaray"], ["69", "Bayburt"], ["70", "Karaman"], ["71", "K\u0131r\u0131kkale"], ["72", "Batman"], ["73", "\u015E\u0131rnak"], ["74", "Bart\u0131n"], ["75", "Ardahan"], ["76", "I\u011Fd\u0131r"], ["77", "Yalova"], ["78", "Karab\xFCk"], ["79", "Kilis"], ["80", "Osmaniye"], ["81", "D\xFCzce"]] }, "UY": { "label": "Region", "list": [["AR", "Artigas"], ["CA", "Canelones"], ["CL", "Cerro Largo"], ["CO", "Colonia"], ["DU", "Durazno"], ["FD", "Florida"], ["FS", "Flores"], ["LA", "Lavalleja"], ["MA", "Maldonado"], ["MO", "Montevideo"], ["PA", "Paysandu"], ["RN", "Rio Negro"], ["RO", "Rocha"], ["RV", "Rivera"], ["SA", "Salto"], ["SJ", "San Jose"], ["SO", "Soriano"], ["TA", "Tacuarembo"], ["TT", "Treinta Y Tres"]] }, "US": { "label": "State", "list": [["AA", "Armed Forces Americas"], ["AE", "Armed Forces Europe"], ["AK", "Alaska"], ["AL", "Alabama"], ["AP", "Armed Forces Pacific"], ["AR", "Arkansas"], ["AZ", "Arizona"], ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DC", "District of Columbia"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["IA", "Iowa"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["MA", "Massachusetts"], ["MD", "Maryland"], ["ME", "Maine"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MO", "Missouri"], ["MS", "Mississippi"], ["MT", "Montana"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["NE", "Nebraska"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NV", "Nevada"], ["NY", "New York"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VA", "Virginia"], ["VT", "Vermont"], ["WA", "Washington"], ["WI", "Wisconsin"], ["WV", "West Virginia"], ["WY", "Wyoming"]] }, "ZA": { "label": "Region", "list": [["EC", "Eastern Cape"], ["FS", "Free State"], ["GT", "Gauteng"], ["LP", "Limpopo"], ["MP", "Mpumalanga"], ["NC", "Northern Cape"], ["NL", "Kwazulu-Natal"], ["NW", "North-West"], ["WC", "Western Cape"]] } } };

// forms-core.ts
var id = (raw) => raw?._id ?? raw?.id ?? "";
var INPUT_BLOCK = {
  STRING: "stringOptions",
  NUMBER: "numberOptions",
  BOOLEAN: "booleanOptions",
  ARRAY: "arrayOptions",
  ADDRESS: "addressOptions",
  WIX_FILE: "wixFileOptions",
  PAYMENT: "paymentOptions",
  SCHEDULING: "schedulingOptions"
};
var COMPONENT_BLOCK = {
  TEXT_INPUT: "textInputOptions",
  PASSWORD: "passwordOptions",
  NUMBER_INPUT: "numberInputOptions",
  RATING_INPUT: "ratingInputOptions",
  PHONE_INPUT: "phoneInputOptions",
  DATE_INPUT: "dateInputOptions",
  DATE_PICKER: "datePickerOptions",
  DATE_TIME: "dateTimeOptions",
  TIME_INPUT: "timeInputOptions",
  CHECKBOX: "checkboxOptions",
  CHECKBOX_GROUP: "checkboxGroupOptions",
  RADIO_GROUP: "radioGroupOptions",
  DROPDOWN: "dropdownOptions",
  TAGS: "tagsOptions",
  MULTILINE_ADDRESS: "multilineAddressOptions",
  FILE_UPLOAD: "fileUploadOptions",
  SIGNATURE: "signatureOptions",
  FIXED_PAYMENT: "fixedPaymentOptions",
  PAYMENT_INPUT: "paymentInputOptions",
  DONATION_INPUT: "donationInputOptions",
  APPOINTMENT: "appointmentOptions",
  SERVICES_DROPDOWN: "servicesDropdownOptions",
  SERVICES_CHECKBOX_GROUP: "servicesCheckboxGroupOptions"
};
var CONTROL = {
  TEXT_INPUT: "text",
  PASSWORD: "password",
  NUMBER_INPUT: "number",
  RATING_INPUT: "rating",
  PHONE_INPUT: "phone",
  DATE_INPUT: "date",
  DATE_PICKER: "date",
  DATE_TIME: "datetime",
  TIME_INPUT: "time",
  CHECKBOX: "checkbox",
  CHECKBOX_GROUP: "checkboxGroup",
  RADIO_GROUP: "radio",
  DROPDOWN: "select",
  TAGS: "tags",
  MULTILINE_ADDRESS: "address",
  FILE_UPLOAD: "file",
  SIGNATURE: "signature",
  FIXED_PAYMENT: "payment",
  PAYMENT_INPUT: "payment",
  DONATION_INPUT: "payment",
  SERVICES_DROPDOWN: "select",
  SERVICES_CHECKBOX_GROUP: "checkboxGroup",
  APPOINTMENT: "appointment"
};
var FILE_FORMAT_ACCEPT = {
  VIDEO: "video/*",
  IMAGE: "image/*",
  AUDIO: "audio/*",
  DOCUMENT: ".ai,.cdr,.csv,.doc,.docb,.docx,.dot,.dotx,.dwg,.eps,.epub,.fla,.gpx,.ical,.icalendar,.ics,.ifb,.indd,.ipynb,.key,.kml,.kmz,.mobi,.mtf,.mtx,.numbers,.odg,.odp,.ods,.odt,.otp,.ots,.ott,.oxps,.pages,.pdf,.pdn,.pkg,.pot,.potx,.pps,.ppsx,.ppt,.pptx,.psd,.pub,.rtf,.sldx,.txt,.json,.vcf,.xcf,.xls,.xlsx,.xlt,.xltx,.xlw,.xps,.xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
  ARCHIVE: ".zip,.rar,.tar,.tar.gz,.gz,.gzip,.jar,.7z,.fgz,.webarchive"
};
var COUNTRY_CODES = ["AD", "AE", "AF", "AG", "AI", "AL", "AM", "AN", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW"];
var warned = /* @__PURE__ */ new Set();
function blockName(table, key, what) {
  const name = key ? table[key] : void 0;
  if (!name && key && !warned.has(what + key)) {
    warned.add(what + key);
    console.warn(
      `forms: no ${what} block mapped for "${key}" \u2014 that field renders without its label or options. Add it to the table in wix/forms/forms-core.ts.`
    );
  }
  return name;
}
function plainText(label) {
  if (typeof label === "string") return label;
  const nodes = label?.nodes;
  if (!Array.isArray(nodes)) return "";
  const BLOCK = /^(PARAGRAPH|HEADING|LIST_ITEM|BLOCKQUOTE|CODE_BLOCK)$/;
  const walk = (list) => list.map((n) => (n?.textData?.text ?? "") + (Array.isArray(n?.nodes) ? walk(n.nodes) : "") + (BLOCK.test(n?.type ?? "") ? "\n" : "")).join("");
  return walk(nodes).replace(/\n{3,}/g, "\n\n").trim();
}
function humanizeSub(sub) {
  const words = sub.replace(/([A-Z])|(\d+)/g, " $1$2").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
function countryName(code) {
  const known = ADDRESS_TEMPLATES.countryNames[code];
  if (known) return known;
  try {
    const dn = Intl.DisplayNames ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
    return dn?.of(code) ?? code;
  } catch {
    return code;
  }
}
var RELATIVE_DATE = /^\$now(?:([+-])(\d{1,2})([yMdmh]))?$/;
function resolveDate(value, control, now = /* @__PURE__ */ new Date()) {
  if (typeof value !== "string" || !value) return void 0;
  const m = value.match(RELATIVE_DATE);
  if (!m) return /^\d{4}-\d{2}-\d{2}|^\d{2}:\d{2}/.test(value) ? value : void 0;
  const d = new Date(now.getTime());
  const sign = m[1] === "-" ? -1 : 1;
  const n = m[2] ? sign * parseInt(m[2], 10) : 0;
  switch (m[3]) {
    case "y":
      d.setUTCFullYear(d.getUTCFullYear() + n);
      break;
    case "M":
      d.setUTCMonth(d.getUTCMonth() + n);
      break;
    case "d":
      d.setUTCDate(d.getUTCDate() + n);
      break;
    case "h":
      d.setUTCHours(d.getUTCHours() + n);
      break;
    case "m":
      d.setUTCMinutes(d.getUTCMinutes() + n);
      break;
  }
  const iso = d.toISOString();
  if (control === "time") return iso.slice(11, 19);
  if (control === "datetime") return iso.slice(0, 19);
  return iso.slice(0, 10);
}
function otherValue(field, text) {
  return `${field.otherOption?.label ?? "Other"}: ${text}`;
}
function otherText(field, value) {
  if (!field.otherOption || typeof value !== "string" || !value) return null;
  if (field.choices.some((c) => c.value === value)) return null;
  const prefix = `${field.otherOption.label}: `;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
function addressOverrides(rules, component) {
  const fields = rules.fields ?? {};
  const settings = component.fieldSettings ?? {};
  return {
    required: Object.fromEntries(Object.keys(fields).map((k) => [k, fields[k]?.required])),
    show: Object.fromEntries(Object.keys(settings).map((k) => [k, settings[k]?.show])),
    allowedCountries: Array.isArray(rules.allowedCountries) ? rules.allowedCountries.map(String) : []
  };
}
function addressPartsForCountry(country, o, required) {
  const code = country ? country.toUpperCase() : "";
  const templateName = ADDRESS_TEMPLATES.byCountry[code] ?? ADDRESS_TEMPLATES.defaultTemplate;
  const template = ADDRESS_TEMPLATES.templates[templateName] ?? ADDRESS_TEMPLATES.templates[ADDRESS_TEMPLATES.defaultTemplate] ?? [];
  const allowed = o.allowedCountries.length ? o.allowedCountries : [...COUNTRY_CODES];
  const parts = [{
    sub: "country",
    label: "Country",
    required: o.required.country ?? required,
    choices: allowed.map((c) => ({ value: c, label: countryName(c) }))
  }];
  const subdivisions = ADDRESS_TEMPLATES.subdivisions[code];
  for (const t of template) {
    if (!(o.show[t.sub] ?? !t.hidden)) continue;
    const isSubdivision = t.sub === "subdivision";
    parts.push({
      sub: t.sub,
      label: isSubdivision && subdivisions ? subdivisions.label : humanizeSub(t.sub),
      required: o.required[t.sub] ?? t.required,
      ...isSubdivision && subdivisions ? { choices: subdivisions.list.map(([k, name]) => ({ value: `${code}-${k}`, label: name })) } : {}
    });
  }
  return parts;
}
function addressParts(rules, component, required) {
  const preset = component.defaultCountryConfig?.countryOptions;
  return addressPartsForCountry(typeof preset === "string" ? preset : void 0, addressOverrides(rules, component), required);
}
function toField(raw, imgSrc2, stepId) {
  const input = raw.inputOptions ?? {};
  const inputType = input.inputType ?? "";
  const optionsBlock = input[blockName(INPUT_BLOCK, inputType, "inputType") ?? ""] ?? {};
  const componentType = optionsBlock.componentType ?? "";
  const component = optionsBlock[blockName(COMPONENT_BLOCK, componentType, "componentType") ?? ""] ?? {};
  const rules = optionsBlock.validation ?? {};
  const identifier = raw.identifier ?? "";
  const required = input.required ?? false;
  let control = CONTROL[componentType] ?? "unknown";
  if (inputType === "PAYMENT") control = "payment";
  if (control === "text") {
    if (identifier === "TEXT_AREA") control = "textarea";
    else if (rules.format === "EMAIL") control = "email";
    else if (rules.format === "URL") control = "url";
    else if (rules.format === "PHONE") control = "phone";
  }
  const dateRules = rules.dateOptions ?? rules.dateTimeOptions ?? rules.timeOptions ?? rules.dateOptionalTimeOptions ?? {};
  const fileFormats = Array.isArray(rules.uploadFileFormats) ? rules.uploadFileFormats : [];
  const isBirthdate = identifier === "CONTACTS_BIRTHDATE";
  const validation = {
    ...rules.format ? { format: rules.format } : {},
    ...rules.minLength != null ? { minLength: rules.minLength } : {},
    ...rules.maxLength != null ? { maxLength: rules.maxLength } : {},
    ...rules.pattern ? { pattern: rules.pattern } : {},
    ...rules.validationMessages?.pattern ? { patternMessage: String(rules.validationMessages.pattern) } : {},
    ...rules.minimum != null ? { minimum: rules.minimum } : {},
    ...rules.maximum != null ? { maximum: rules.maximum } : {},
    ...rules.multipleOf != null ? { multipleOf: rules.multipleOf } : {},
    // CONTACTS_BIRTHDATE is bounded 1900-01-01..today by Wix's own field (contacts-birthdate-validation.tsx).
    ...resolveDate(dateRules.minimum, control) || isBirthdate ? { minDate: resolveDate(dateRules.minimum, control) ?? "1900-01-01" } : {},
    ...resolveDate(dateRules.maximum, control) || isBirthdate ? { maxDate: resolveDate(dateRules.maximum, control) ?? resolveDate("$now", "date") } : {},
    ...rules.fileLimit != null ? { fileLimit: rules.fileLimit } : {},
    ...fileFormats.length ? { fileFormats, accept: fileFormats.map((f) => FILE_FORMAT_ACCEPT[f]).filter(Boolean).join(",") } : control === "file" || control === "signature" ? { accept: "" } : {},
    ...rules.minItems != null ? { minItems: rules.minItems } : {},
    ...rules.maxItems != null ? { maxItems: rules.maxItems } : {},
    // "Must be checked" is a BOOLEAN enum of [true]; `required` alone only checks presence.
    ...inputType === "BOOLEAN" && Array.isArray(rules.enum) && rules.enum.length === 1 && rules.enum[0] === true ? { mustBeTrue: true } : {},
    ...Array.isArray(rules.phoneOptions?.allowedCountryCodes) && rules.phoneOptions.allowedCountryCodes.length ? { allowedCountryCodes: [...rules.phoneOptions.allowedCountryCodes] } : {}
  };
  const options = Array.isArray(component.options) ? component.options : [];
  const choices = options.map((o) => ({
    value: String(o.value),
    label: String(o.label ?? o.value),
    // IMAGE_CHOICE options carry `media.image` (a wix:image URI) — resolved to a URL here.
    ...o.media ? { imageUrl: imgSrc2(o.media, 400, 400) } : {}
  }));
  const target = input.target ?? "";
  const label = plainText(component.label) || target;
  const defaultValue = control === "address" ? {} : inputType === "ARRAY" ? options.filter((o) => o.default).map((o) => String(o.value)) : inputType === "WIX_FILE" ? [] : inputType === "BOOLEAN" ? component.checked === true : control === "select" || control === "radio" ? String(options.find((o) => o.default)?.value ?? "") : control === "rating" ? component.defaultValue ?? "" : control === "date" || control === "time" || control === "datetime" ? resolveDate(component.default, control) ?? "" : component.default ?? "";
  return {
    target,
    label,
    showLabel: component.showLabel !== false,
    control,
    required,
    readOnly: input.readOnly === true,
    hidden: raw.hidden === true,
    stepId,
    ...component.placeholder ? { placeholder: String(component.placeholder) } : {},
    ...component.description ? { description: plainText(component.description) } : {},
    defaultValue,
    choices,
    ...component.customOption ? { otherOption: { label: String(component.customOption.label ?? "Other"), ...component.customOption.placeholder ? { placeholder: String(component.customOption.placeholder) } : {} } } : {},
    addressParts: control === "address" ? addressParts(rules, component, required) : [],
    ...control === "address" ? { addressOverrides: addressOverrides(rules, component) } : {},
    validation,
    ...component.defaultCountryCode ? { phoneCountry: String(component.defaultCountryCode) } : {},
    ...component.buttonText ? { buttonText: String(component.buttonText) } : {},
    ...component.explanationText ? { explanationText: String(component.explanationText) } : {},
    identifier,
    inputType,
    componentType
  };
}
function orderedInputs(raw) {
  const steps = (raw.steps ?? []).filter((s) => !s.hidden);
  const placed = /* @__PURE__ */ new Map();
  let i = 0;
  for (const s of steps) {
    const items = (s.layout?.large?.items ?? s.layout?.small?.items ?? []).slice().sort((a, b) => a.row - b.row || a.column - b.column);
    for (const item of items) placed.set(item.fieldId, { order: i++, stepId: id(s) });
  }
  const lastStep = id(steps[steps.length - 1]);
  return (raw.formFields ?? []).filter((f) => f.fieldType === "INPUT").map((f) => ({ field: f, order: placed.get(id(f))?.order ?? Infinity, stepId: placed.get(id(f))?.stepId ?? lastStep })).sort((a, b) => a.order - b.order).map(({ field, stepId }) => ({ field, stepId }));
}
var LEGACY_OPERATOR = {
  equal: "EQUAL",
  notEqual: "NOT_EQUAL",
  empty: "EMPTY",
  notEmpty: "NOT_EMPTY",
  contains: "CONTAINS",
  notContains: "NOT_CONTAINS",
  greaterThan: "GREATER_THAN",
  greaterThanOrEqual: "GREATER_THAN_OR_EQUALS",
  lessThan: "LESS_THAN",
  lessThanOrEqual: "LESS_THAN_OR_EQUALS",
  after: "AFTER",
  afterOrEqual: "AFTER_OR_EQUAL",
  before: "BEFORE",
  beforeOrEqual: "BEFORE_OR_EQUAL",
  between: "BETWEEN",
  any: "ANY",
  arrayEqual: "ARRAY_EQUAL",
  arrayNotEqual: "ARRAY_NOT_EQUAL",
  checked: "CHECKED",
  notChecked: "NOT_CHECKED",
  in: "IN",
  notIn: "NOT_IN",
  isDateNewerThan: "IS_DATE_NEWER_THAN",
  isDateOlderThan: "IS_DATE_OLDER_THAN",
  isDateNewerThanOrEqual: "IS_DATE_NEWER_THAN_OR_EQUAL",
  isDateOlderThanOrEqual: "IS_DATE_OLDER_THAN_OR_EQUAL"
};
function toRules(raw) {
  const targetOf = new Map(
    (raw.formFields ?? []).filter((f) => f.inputOptions?.target).map((f) => [id(f), f.inputOptions.target])
  );
  const targets = new Set(targetOf.values());
  const out = [];
  const v4Node = (n) => {
    if (!n) return null;
    if (n.and?.conditions) {
      const list = n.and.conditions.map(v4Node);
      return list.every(Boolean) && list.length ? { and: list } : null;
    }
    if (n.or?.conditions) {
      const list = n.or.conditions.map(v4Node);
      return list.every(Boolean) && list.length ? { or: list } : null;
    }
    const c = n.condition;
    if (!c?.target || !c.operator || !targets.has(String(c.target).split(".")[0])) return null;
    return { target: String(c.target), operator: String(c.operator), value: c.value };
  };
  for (const rule of raw.formRules ?? []) {
    const when = v4Node(rule.expression);
    const then = (rule.overrides ?? []).flatMap((o) => {
      const f = o.fieldOptions;
      const target = f?.fieldId ? targetOf.get(f.fieldId) : void 0;
      if (!target) return [];
      if (f.propertyType === "HIDDEN") return [{ target, hidden: f.hiddenOptions?.hidden === true }];
      if (f.propertyType === "REQUIRED") return [{ target, required: f.requiredOptions?.required === true }];
      if (f.propertyType === "ALLOWED_VALUES") return [{ target, allowedValues: (f.allowedValuesOptions?.allowedValues ?? []).map(String) }];
      return [];
    });
    if (when && then.length) out.push({ id: id(rule), when, then });
  }
  const legacyNode = (n) => {
    if (!n) return null;
    if (Array.isArray(n.and)) {
      const list = n.and.map(legacyNode);
      return list.every(Boolean) && list.length ? { and: list } : null;
    }
    if (Array.isArray(n.or)) {
      const list = n.or.map(legacyNode);
      return list.every(Boolean) && list.length ? { or: list } : null;
    }
    const target = n.fact ? targetOf.get(String(n.fact)) : void 0;
    if (!target || !n.operator) return null;
    return { target, operator: LEGACY_OPERATOR[String(n.operator)] ?? String(n.operator), value: n.value };
  };
  for (const rule of raw.rules ?? []) {
    const when = legacyNode(rule.condition);
    const then = (rule.overrides ?? []).flatMap((o) => {
      if (o.entityType !== "FIELD" || !o.entityId) return [];
      const target = targetOf.get(String(o.entityId));
      if (!target) return [];
      const ch = o.valueChanges ?? {};
      const effect = { target };
      if (typeof ch.hidden === "boolean") effect.hidden = ch.hidden;
      if (typeof ch["validation.required"] === "boolean") effect.required = ch["validation.required"];
      if (Array.isArray(ch["validation.string.enum"])) effect.allowedValues = ch["validation.string.enum"].map(String);
      else if (Array.isArray(ch["view.options"])) effect.allowedValues = ch["view.options"].map((opt) => String(opt?.value ?? opt?.label ?? opt));
      return Object.keys(effect).length > 1 ? [effect] : [];
    });
    if (when && then.length) out.push({ id: id(rule), when, then });
  }
  return out;
}
var missing = (v) => v === void 0 || v === null || v === "" || Array.isArray(v) && v.length === 0;
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function ordinal(v) {
  if (typeof v === "number") return v;
  if (typeof v !== "string" || !v) return null;
  const t = new Date(/^\d{2}:\d{2}(:\d{2})?$/.test(v) ? `2000-01-01 ${v}` : v).getTime();
  return Number.isNaN(t) ? null : t;
}
function dayDiff(given, spec, now) {
  if (!Array.isArray(spec) || spec.length !== 2 || typeof given !== "string") return null;
  const units = Number(spec[0]);
  const unit = spec[1];
  const date = new Date(given);
  if (Number.isNaN(date.getTime()) || Number.isNaN(units) || unit !== "day" && unit !== "month") return null;
  const pivot = new Date(now.getTime());
  if (unit === "day") pivot.setDate(pivot.getDate() + units);
  else pivot.setMonth(pivot.getMonth() + units);
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return { date: day(date), pivot: day(pivot) };
}
function holds(operator, given, expected, now = /* @__PURE__ */ new Date()) {
  const g = given, e = expected;
  const contains = () => {
    if (missing(g)) return false;
    if (isObj(g)) return Object.values(g).includes(e);
    if (Array.isArray(g) || typeof g === "string") return g.indexOf(e) > -1;
    return false;
  };
  const within = () => {
    if (isObj(e)) return Object.values(e).includes(g);
    if (Array.isArray(e) || typeof e === "string") return e.indexOf(g) > -1;
    return false;
  };
  const cmp = (op) => {
    if (missing(g)) return false;
    const a = ordinal(g), b = ordinal(e);
    return a !== null && b !== null && op(a, b);
  };
  const arrayEq = () => {
    if (missing(g) || !Array.isArray(g) || !Array.isArray(e) || g.length !== e.length) return false;
    return e.every((v) => g.includes(v));
  };
  switch (operator) {
    case "EQUAL":
      return g === e;
    case "NOT_EQUAL":
      return g !== e;
    case "EMPTY":
      return missing(g);
    case "NOT_EMPTY":
      return !missing(g);
    case "CONTAINS":
      return contains();
    case "NOT_CONTAINS":
      return !contains();
    case "GREATER_THAN":
    case "AFTER":
      return cmp((a, b) => a > b);
    case "GREATER_THAN_OR_EQUALS":
    case "AFTER_OR_EQUAL":
      return cmp((a, b) => a >= b);
    case "LESS_THAN":
    case "BEFORE":
      return cmp((a, b) => a < b);
    case "LESS_THAN_OR_EQUALS":
    case "BEFORE_OR_EQUAL":
      return cmp((a, b) => a <= b);
    case "BETWEEN": {
      if (missing(g) || !Array.isArray(e) || e.length !== 2) return false;
      const a = ordinal(g), lo = ordinal(e[0]), hi = ordinal(e[1]);
      return a !== null && lo !== null && hi !== null && a > Math.min(lo, hi) && a < Math.max(lo, hi);
    }
    case "ANY": {
      if (missing(g) || !Array.isArray(e)) return false;
      return (Array.isArray(g) ? g : [g]).some((v) => e.includes(v));
    }
    case "ARRAY_EQUAL":
      return arrayEq();
    case "ARRAY_NOT_EQUAL":
      return !arrayEq();
    case "CHECKED":
      return Boolean(g);
    case "NOT_CHECKED":
      return !g;
    case "IN":
      return within();
    case "NOT_IN":
      return !within();
    case "IS_DATE_NEWER_THAN":
    case "IS_DATE_NEWER_THAN_OR_EQUAL": {
      const d = dayDiff(g, e, now);
      return !!d && (operator.endsWith("OR_EQUAL") ? d.date >= d.pivot : d.date > d.pivot);
    }
    case "IS_DATE_OLDER_THAN":
    case "IS_DATE_OLDER_THAN_OR_EQUAL": {
      const d = dayDiff(g, Array.isArray(e) ? [-Number(e[0]), e[1]] : e, now);
      return !!d && (operator.endsWith("OR_EQUAL") ? d.date <= d.pivot : d.date < d.pivot);
    }
    default:
      return false;
  }
}
function valueAt(values, target) {
  return target.split(".").reduce((v, k) => isObj(v) ? v[k] : void 0, values);
}
function conditionHolds(when, values, now = /* @__PURE__ */ new Date()) {
  if ("and" in when) return when.and.every((c) => conditionHolds(c, values, now));
  if ("or" in when) return when.or.some((c) => conditionHolds(c, values, now));
  return holds(when.operator, valueAt(values, when.target), when.value, now);
}
function applyRules(form, values, now = /* @__PURE__ */ new Date()) {
  if (!form.rules.length) return form.fields;
  const byTarget = new Map(form.fields.map((f) => [f.target, { ...f }]));
  for (const rule of form.rules) {
    if (!conditionHolds(rule.when, values, now)) continue;
    for (const effect of rule.then) {
      const f = byTarget.get(effect.target);
      if (!f) continue;
      if (effect.hidden !== void 0) f.hidden = effect.hidden;
      if (effect.required !== void 0) f.required = effect.required;
      if (effect.allowedValues) {
        const allowed = new Set(effect.allowedValues);
        f.choices = f.choices.filter((c) => allowed.has(c.value));
      }
    }
  }
  return form.fields.map((f) => byTarget.get(f.target));
}
function toSuccess(settings) {
  const action = settings?.submitSuccessAction ?? "NO_ACTION";
  const out = { action };
  if (action === "THANK_YOU_MESSAGE") {
    const message = plainText(settings?.thankYouMessageOptions?.richContent);
    if (message) out.message = message;
    const seconds = Number(settings?.thankYouMessageOptions?.durationInSeconds ?? 0);
    if (seconds > 0) out.durationSeconds = seconds;
  }
  if (action === "REDIRECT" && settings?.redirectOptions?.redirectUrl) {
    out.redirectUrl = `https://${String(settings.redirectOptions.redirectUrl).replace(/^https?:\/\//, "")}`;
    out.newTab = settings.redirectOptions.target !== "SELF";
  }
  return out;
}
function toForm(raw, imgSrc2) {
  const submit = (raw.formFields ?? []).find((f) => f.identifier === "SUBMIT_BUTTON");
  const nav = submit?.displayOptions?.pageNavigationOptions ?? {};
  const ordered = orderedInputs(raw);
  const fields = ordered.map(({ field, stepId }) => toField(field, imgSrc2, stepId));
  const steps = (raw.steps ?? []).filter((s) => !s.hidden).map((s) => ({ id: id(s), name: s.name ?? "", targets: fields.filter((f) => f.stepId === id(s)).map((f) => f.target) }));
  const limitation = raw.limitationRule ?? {};
  const deadline = limitation.dateTimeDeadline ? new Date(limitation.dateTimeDeadline).toISOString() : void 0;
  const indicator = raw.requiredIndicatorProperties ?? {};
  return {
    id: id(raw),
    name: raw.name ?? "",
    fields,
    steps: steps.length ? steps : [{ id: "", name: "", targets: fields.map((f) => f.target) }],
    rules: toRules(raw),
    // The button wording lives on a DISPLAY field, nested under pageNavigationOptions because
    // one control drives both multi-page navigation and the final submit.
    submitText: nav.submitText ?? "",
    nextText: nav.nextPageText ?? "",
    previousText: nav.previousPageText ?? "",
    // `enabled` (default true) replaces the older `properties.disabled`; read both.
    enabled: raw.enabled != null ? raw.enabled !== false : raw.properties?.disabled !== true,
    disabledMessage: plainText(raw.disabledFormMessage),
    limits: {
      ...deadline ? { deadline } : {},
      ...limitation.maxAllowedSubmissions != null ? { maxSubmissions: Number(limitation.maxAllowedSubmissions) } : {},
      ...limitation.submissionLimitPerUser != null ? { perVisitor: Number(limitation.submissionLimitPerUser) } : {}
    },
    requiredIndicator: indicator.requiredIndicator ?? "ASTERISK",
    requiredIndicatorBefore: indicator.requiredIndicatorPlacement === "BEFORE_FIELD_TITLE",
    success: toSuccess(raw.submitSettings)
  };
}
function isClosed(form, now = /* @__PURE__ */ new Date()) {
  return !form.enabled || !!form.limits.deadline && new Date(form.limits.deadline).getTime() <= now.getTime();
}

// forms.ts
async function getForm(formId) {
  const res = await wixRequest(`/form-schema-service/v4/forms/${encodeURIComponent(formId)}`, { method: "GET" });
  if (!res?.form) throw new Error(`forms: form "${formId}" not found.`);
  return toForm(res.form, imgSrc);
}

// submissions-core.ts
var SUBMITTED_OK = /* @__PURE__ */ new Set(["CONFIRMED", "PENDING", "PAYMENT_WAITING"]);
var normalizePhone = (v) => String(v ?? "").replace(/[^0-9+]/g, "");
function normalizeUrl(v) {
  const s = String(v ?? "").trim();
  if (!s || /^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return s;
  return /^[\w-]+(\.[\w-]+)+(\/|$|\?|#)/.test(s) ? `https://${s}` : s;
}
var L = "\\u00A1-\\uD7FF\\uE000-\\uFFFF-a-zA-Z";
var LD = `${L}0-9`;
var SYM = "!#$%&'*+/=?^_`{|}~-";
var EMAIL_PATTERN = new RegExp(
  `^(?:[${LD}${SYM}]+(?:\\.[${LD}${SYM}]+)*)@(?:[${LD}](?:[${LD}-]*[${LD}])?\\.)+(?:(?:[0-9]+[${L}][${LD}]*)|(?:[${L}][${LD}]{1,}))$`
);
var PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;
var uploadMimeType = (file) => file.type || "application/octet-stream";
var isUploaded = (v) => typeof v === "object" && v !== null && typeof v.fileId === "string" && typeof v.displayName === "string";
async function putUpload(uploadUrl, file, mimeType = uploadMimeType(file)) {
  const put = await fetch(`${uploadUrl}?filename=${encodeURIComponent(file.name)}`, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: file
  });
  if (!put.ok) {
    throw new Error(`forms: could not upload "${file.name}" (${put.status}). Check its size and type.`);
  }
  let uploaded = {};
  try {
    uploaded = (await put.json())?.file ?? {};
  } catch {
  }
  return {
    // Wix's headless wrapper submits a placeholder id when it has none (react/Form.tsx), so the
    // server accepts any string here; the real Media Manager id is used when the PUT returns it.
    fileId: String(uploaded.id ?? uploaded.fileId ?? "uploaded"),
    displayName: String(uploaded.displayName ?? file.name),
    fileType: mimeType,
    ...uploaded.url ? { url: String(uploaded.url) } : {}
  };
}
async function uploadFilesWith(uploadOne, formId, fields, values) {
  const next = { ...values };
  for (const field of fields) {
    if (field.hidden || field.control !== "file" && field.control !== "signature") continue;
    const picked = [].concat(values[field.target] ?? []);
    const done = [];
    for (const item of picked) {
      if (isUploaded(item)) done.push(item);
      else if (typeof File !== "undefined" && item instanceof File) done.push(await uploadOne(formId, item));
    }
    next[field.target] = done;
  }
  return next;
}
function withSeconds(value) {
  return /(^|T)\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}
function toSubmissionValues(fields, values) {
  const filled = (v) => v !== void 0 && v !== null && String(v).trim() !== "";
  const out = {};
  for (const field of fields) {
    if (field.hidden) continue;
    const raw = values?.[field.target];
    if (field.control === "address") {
      const parts = {};
      const held = raw ?? {};
      for (const { sub } of field.addressParts) {
        if (filled(held[sub])) parts[sub] = String(held[sub]).trim();
      }
      if (Object.keys(parts).length || field.required) out[field.target] = parts;
      continue;
    }
    if (field.control === "file" || field.control === "signature") {
      const files = [].concat(raw ?? []).filter(isUploaded);
      if (files.length) out[field.target] = files;
      continue;
    }
    if (field.inputType === "ARRAY") {
      const picked = (Array.isArray(raw) ? raw : []).filter(filled);
      if (picked.length) out[field.target] = picked;
      continue;
    }
    if (field.control === "checkbox") {
      if (raw === true) out[field.target] = true;
      continue;
    }
    if (!filled(raw)) continue;
    const value = typeof raw === "string" ? raw.trim() : raw;
    out[field.target] = field.control === "number" || field.control === "rating" ? Number(value) : field.control === "phone" ? normalizePhone(value) : field.control === "url" ? normalizeUrl(value) : field.control === "time" || field.control === "datetime" ? withSeconds(String(value)) : value;
  }
  return out;
}
function toSubmission(created) {
  const submission = created?.submission ?? created;
  const id2 = submission?._id ?? submission?.id;
  if (!id2) throw new Error("forms: submission failed (nothing returned).");
  const status = submission?.status ?? "";
  if (!SUBMITTED_OK.has(status)) {
    throw new Error(
      `forms: submission status is "${status}" \u2014 not one of the statuses that mean the submission was created (${[...SUBMITTED_OK].join(", ")}), so do not show a success state.`
    );
  }
  const checkoutId = submission?.orderDetails?.checkoutId;
  return { id: id2, status, ...checkoutId ? { checkoutId } : {} };
}
function redirectSessionBody(checkoutId, origin) {
  return {
    ecomCheckout: { checkoutId },
    callbacks: origin ? { postFlowUrl: `${origin}/`, thankYouPageUrl: `${origin}/` } : {}
  };
}
function redirectSessionUrl(res) {
  const url = res?.redirectSession?.fullUrl;
  if (!url) throw new Error("forms: checkout could not start (no redirect URL returned).");
  return url;
}
function detailsOf(err) {
  const e = err;
  return e?.details ?? e?.body?.details ?? e?.response?.data?.details ?? {};
}
function violationEntries(err) {
  const violations = detailsOf(err)?.validationError?.fieldViolations ?? [];
  return violations.flatMap((v) => v.data?.errors ?? [v]);
}
function submissionErrors(err, fields) {
  const byTarget = new Map(fields.map((f) => [f.target, f]));
  const out = {};
  for (const entry of violationEntries(err)) {
    const path = entry?.errorPath;
    if (!path) continue;
    const field = byTarget.get(path.split("/")[0]);
    if (!field) continue;
    console.debug("forms: server violation", path, entry.errorType, entry.errorMessage);
    out[path] = entry.useCustomErrorMessage && entry.errorMessage ? String(entry.errorMessage) : messageFor(entry.errorType, field, path);
  }
  return out;
}
function formLevelError(err, form) {
  const details = detailsOf(err);
  const code = details?.applicationError?.code ?? err?.code;
  switch (code) {
    case "INVALID_CAPTCHA":
      return "The spam check did not pass. Please try again.";
    case "FORM_NOT_FOUND":
      return "This form no longer exists.";
    case "SITE_IS_A_TEMPLATE":
      return "This site is a template and does not accept submissions.";
    case "FORM_RETRIEVAL_ERROR":
      return "The form could not be loaded. Please try again.";
  }
  for (const entry of violationEntries(err)) {
    if (entry.errorType === "DISABLED_FORM_ERROR" || entry.errorPath === "form.properties.disabled") {
      return form?.disabledMessage || "This form is no longer accepting submissions.";
    }
    if (entry.useCustomErrorMessage && !entry.errorPath && entry.errorMessage) return String(entry.errorMessage);
  }
  return null;
}
function requiredMessage(f) {
  switch (f.identifier) {
    case "CONTACTS_FIRST_NAME":
    case "FULL_NAME_FIRST_NAME":
      return "Enter a first name.";
    case "CONTACTS_LAST_NAME":
    case "FULL_NAME_LAST_NAME":
      return "Enter a last name.";
    case "CONTACTS_COMPANY":
      return "Enter a company name.";
    case "CONTACTS_POSITION":
      return "Enter a position or job title.";
    case "CONTACTS_ADDRESS":
      return "Enter an address.";
    case "VAT_ID":
    case "CONTACTS_TAX_ID":
      return "Enter a VAT ID number.";
  }
  switch (f.control) {
    case "email":
      return "Enter an email address like example@mysite.com.";
    case "phone":
      return "Enter a phone number.";
    case "url":
      return "Enter a web URL like https://www.example.com.";
    case "number":
      return "Enter a number.";
    case "rating":
      return "Choose a star rating.";
    case "date":
    case "datetime":
      return "Choose a date.";
    case "time":
      return "Enter a time.";
    case "select":
    case "radio":
    case "checkboxGroup":
    case "tags":
      return "Choose an option.";
    case "checkbox":
      return "Check the box to continue.";
    case "file":
      return "Upload a file.";
    case "signature":
      return "Sign in the box above.";
    case "address":
      return "Enter an address.";
    default:
      return "Enter an answer.";
  }
}
function addressPartMessage(sub) {
  switch (sub) {
    case "country":
      return "Choose a country/region.";
    case "addressLine":
      return "Enter an address.";
    case "addressLine2":
      return "Enter a second address line (e.g., apartment, suite, floor).";
    case "city":
      return "Enter a city.";
    case "postalCode":
      return "Enter a zip/postal code.";
    case "subdivision":
      return "Choose an option.";
    case "streetName":
      return "Enter a street name.";
    case "streetNumber":
      return "Enter a house number.";
    default:
      return "This field is required.";
  }
}
var plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function messageFor(errorType, f, path = f.target) {
  const v = f.validation;
  const sub = path.includes("/") ? path.split("/")[1] : void 0;
  switch (errorType) {
    case "REQUIRED_VALUE_ERROR":
      return sub ? addressPartMessage(sub) : requiredMessage(f);
    case "MIN_LENGTH_ERROR":
    case "MAX_LENGTH_ERROR":
    case "CHARACTER_LENGTH_RANGE_ERROR":
    case "EXACT_CHARACTER_LENGTH_ERROR":
      return lengthMessage(v.minLength, v.maxLength);
    case "MIN_VALUE_ERROR":
    case "MAX_VALUE_ERROR":
    case "VALUE_RANGE_ERROR":
      if (f.identifier === "CONTACTS_BIRTHDATE") return "Enter a date from January 1, 1900 to today.";
      if (f.control === "date" || f.control === "datetime" || f.control === "time") return dateRangeMessage(v.minDate, v.maxDate);
      return rangeMessage(v.minimum, v.maximum);
    case "MULTIPLE_OF_VALUE_ERROR":
    case "DECIMAL_POINT_ERROR":
      return multipleOfMessage(v.multipleOf);
    case "MIN_ITEMS_ERROR":
    case "MAX_ITEMS_ERROR":
    case "EXACT_ITEMS_NUMBER_ERROR":
      return itemsMessage(v.minItems, v.maxItems);
    case "PATTERN_ERROR":
    case "INVALID_VALUE_FOR_PATTERN_ERROR":
      return v.patternMessage ?? (sub === "postalCode" ? "Enter a valid zip/postal code." : "Enter a valid answer.");
    case "NOT_ALLOWED_VALUE_ERROR":
      if (f.control === "checkbox") return "Check the box to continue.";
      if (f.control === "phone") return "Phone numbers with this country code aren\u2019t accepted.";
      return "The chosen value is not allowed.";
    case "INVALID_PHONE_COUNTRY_CODE_ERROR":
      return "Enter a valid country code.";
    case "INCOMPLETE_DATE_ERROR":
      return "Enter a month, day and year.";
    case "FORMAT_ERROR":
      return f.control === "email" || v.format === "EMAIL" ? "Enter an email address like example@mysite.com." : f.control === "phone" || v.format === "PHONE" ? "Enter a valid phone number." : f.control === "url" || v.format === "URL" ? "Enter a web URL like https://www.example.com." : f.control === "time" ? "Enter hours and minutes." : f.control === "date" || f.control === "datetime" ? "Enter a month, day and year." : "Enter a valid answer.";
    case "TYPE_ERROR":
      return "Enter a valid answer.";
    // A key the server does not know for this field — for an address, a subfield the chosen
    // country's template lacks. The store sends only the country's own parts, so this is rare.
    case "UNKNOWN_VALUE_ERROR":
      return sub ? `${humanizeSub(sub)} isn't part of an address in this country.` : "This answer isn't accepted here.";
    // The enum grows; an unmapped type degrades to safe copy rather than showing nothing.
    default:
      return `Please check ${f.label}.`;
  }
}
function lengthMessage(min, max) {
  if (min && max) return min === max ? `Enter exactly ${plural(min, "character", "characters")}.` : `Enter between ${min} and ${max} characters.`;
  if (min) return `Enter at least ${plural(min, "character", "characters")}.`;
  return `Enter less than ${plural(max ?? 0, "character", "characters")}.`;
}
function rangeMessage(min, max) {
  if (min != null && max != null) return `Enter a number from ${min} to ${max}.`;
  if (min != null) return `Enter a number that is ${min} or more.`;
  return `Enter a number that is ${max} or less.`;
}
function dateRangeMessage(min, max) {
  const show = (s) => s.replace("T", " ");
  if (min && max) return `Choose a date from ${show(min)} to ${show(max)}.`;
  if (min) return `Choose a date from ${show(min)} on.`;
  return `Choose a date up to ${show(max ?? "")}.`;
}
function multipleOfMessage(step) {
  const decimals = String(step ?? 1).split(".")[1]?.length ?? 0;
  return decimals ? `Add ${decimals} number(s) after the decimal point.` : step && step !== 1 ? `Choose a multiple of ${step}.` : "Enter a whole number.";
}
function itemsMessage(min, max) {
  if (min && max && min === max) return `Choose ${plural(min, "option", "options")}.`;
  if (min && max) return `Choose between ${min} and ${max} options.`;
  if (min) return `Choose at least ${plural(min, "option", "options")}.`;
  return `Choose up to ${plural(max ?? 0, "option", "options")}.`;
}

// submissions.ts
var SUBMISSIONS = "/form-submission-service/v4/submissions";
async function uploadFile(formId, file) {
  const mimeType = uploadMimeType(file);
  const res = await wixRequest(`${SUBMISSIONS}/media-upload-url`, { body: { formId, filename: file.name, mimeType } });
  const uploadUrl = res?.uploadUrl;
  if (!uploadUrl) throw new Error(`forms: no upload URL for "${file.name}".`);
  return putUpload(uploadUrl, file, mimeType);
}
async function uploadFiles(formId, fields, values) {
  return uploadFilesWith(uploadFile, formId, fields, values);
}
async function createSubmission(formId, values, { captchaToken } = {}) {
  const created = await wixRequest(SUBMISSIONS, {
    body: { submission: { formId, submissions: values }, ...captchaToken ? { captchaToken } : {} }
  });
  return toSubmission(created);
}
async function checkoutUrl(checkoutId, origin = typeof window !== "undefined" ? window.location.origin : "") {
  const res = await wixRequest("/headless/v1/redirect-session", { body: redirectSessionBody(checkoutId, origin) });
  return redirectSessionUrl(res);
}

// form-store.ts
var FORM_ERROR = "@form";
function emptyValue(field) {
  return field.control === "address" ? {} : field.inputType === "ARRAY" || field.inputType === "WIX_FILE" ? [] : field.inputType === "BOOLEAN" ? false : "";
}
function defaultValues(fields) {
  const values = {};
  for (const f of fields) values[f.target] = Array.isArray(f.defaultValue) ? [...f.defaultValue] : f.defaultValue;
  return values;
}
var isBlank = (v) => v === void 0 || v === null || String(v).trim() === "";
function validateValue(field, value) {
  const v = String(value ?? "").trim();
  const rules = field.validation;
  if (field.required && !field.readOnly && !v) return requiredMessage(field);
  if (!v) return "";
  if (field.control === "number" || field.control === "rating") {
    const n = Number(v);
    if (!Number.isFinite(n)) return "Enter a number.";
    if (field.control === "rating" && !(Number.isInteger(n) && n >= 1 && n <= 5)) return "Choose a star rating.";
    if (rules.minimum != null && n < rules.minimum || rules.maximum != null && n > rules.maximum) return rangeMessage(rules.minimum, rules.maximum);
    if (rules.multipleOf && Math.abs(n / rules.multipleOf - Math.round(n / rules.multipleOf)) > 1e-9) return multipleOfMessage(rules.multipleOf);
    return "";
  }
  if (field.control === "date" || field.control === "time" || field.control === "datetime") {
    const x = withSeconds(v);
    if (rules.minDate && x < withSeconds(rules.minDate) || rules.maxDate && x > withSeconds(rules.maxDate)) {
      return field.identifier === "CONTACTS_BIRTHDATE" ? "Enter a date from January 1, 1900 to today." : dateRangeMessage(rules.minDate, rules.maxDate);
    }
    return "";
  }
  if (field.control === "select" || field.control === "radio") {
    if (field.choices.length && !field.otherOption && !field.choices.some((c) => c.value === v)) return "The chosen value is not allowed.";
    return "";
  }
  if (rules.minLength && v.length < rules.minLength || rules.maxLength && v.length > rules.maxLength)
    return lengthMessage(rules.minLength, rules.maxLength);
  if (rules.format === "EMAIL" && !EMAIL_PATTERN.test(v)) return "Enter an email address like example@mysite.com.";
  if (rules.format === "URL" && !/^https?:\/\/[^\s/?#]+[^\s]*$/i.test(normalizeUrl(v))) return "Enter a web URL like https://www.example.com.";
  if (rules.format === "PHONE" && !PHONE_PATTERN.test(normalizePhone(v))) return "Enter a valid phone number.";
  if (rules.pattern) {
    try {
      if (!new RegExp(rules.pattern).test(v)) return rules.patternMessage ?? "Enter a valid answer.";
    } catch {
    }
  }
  return "";
}
function errorsForField(field, values) {
  const errors = {};
  if (field.hidden) return errors;
  const required = field.required && !field.readOnly;
  if (field.control === "address") {
    const parts = values[field.target] ?? {};
    for (const { sub, required: subRequired } of field.addressParts) {
      if (subRequired && isBlank(parts[sub])) errors[`${field.target}/${sub}`] = addressPartMessage(sub);
    }
    return errors;
  }
  if (field.control === "file" || field.control === "signature") {
    const picked = [].concat(values[field.target] ?? []).filter(Boolean);
    const limit = Math.min(field.validation.fileLimit ?? 30, 30);
    if (required && !picked.length) errors[field.target] = requiredMessage(field);
    else if (picked.length > limit) errors[field.target] = `There is an upload limit of ${limit} file${limit === 1 ? "" : "s"}.`;
    return errors;
  }
  if (field.inputType === "ARRAY") {
    const picked = (Array.isArray(values[field.target]) ? values[field.target] : []).filter((x) => !isBlank(x));
    const { minItems, maxItems } = field.validation;
    if (required && !picked.length) errors[field.target] = requiredMessage(field);
    else if (minItems && picked.length < minItems || maxItems && picked.length > maxItems) errors[field.target] = itemsMessage(minItems, maxItems);
    else if (field.choices.length && !field.otherOption && picked.some((x) => !field.choices.some((c) => c.value === x)))
      errors[field.target] = "The chosen value is not allowed.";
    return errors;
  }
  if (field.control === "checkbox") {
    if ((required || field.validation.mustBeTrue) && values[field.target] !== true) errors[field.target] = "Check the box to continue.";
    return errors;
  }
  const message = validateValue(field, values[field.target]);
  if (message) errors[field.target] = message;
  return errors;
}
function errorsForForm(fields, values) {
  const errors = {};
  for (const field of fields) Object.assign(errors, errorsForField(field, values));
  return errors;
}
function focusControl(formEl, name) {
  const control = formEl?.elements?.namedItem?.(name);
  const node = typeof RadioNodeList !== "undefined" && control instanceof RadioNodeList ? control[0] : control;
  node?.focus?.();
}
function createFormStore({ formId, initialForm }) {
  let base = initialForm ?? null;
  let applied = base ? applyRules(base, defaultValues(base.fields)) : [];
  let empty = defaultValues(base?.fields ?? []);
  let values = empty;
  let errors = {};
  let loading = !initialForm;
  let step = 0;
  let outcome = null;
  let captchaToken = null;
  let started = false;
  let generation = 0;
  let hideTimer = null;
  const listeners = /* @__PURE__ */ new Set();
  let snapshot = null;
  const emit = () => {
    snapshot = null;
    for (const fn of listeners) fn();
  };
  const withCountryParts = (f) => {
    if (f.control !== "address" || !f.addressOverrides) return f;
    const country = values[f.target]?.country;
    return { ...f, addressParts: addressPartsForCountry(typeof country === "string" && country ? country : void 0, f.addressOverrides, f.required) };
  };
  function visibleForm() {
    if (!base) return null;
    const fields = applied.filter((f) => !f.hidden).map(withCountryParts);
    const shown = new Set(fields.map((f) => f.target));
    const steps = base.steps.map((s) => ({ ...s, targets: s.targets.filter((t) => shown.has(t)) }));
    return { ...base, fields, steps };
  }
  function getState() {
    if (snapshot) return snapshot;
    snapshot = { form: visibleForm(), values, errors, loading, step, closed: base ? isClosed(base) : false, outcome };
    return snapshot;
  }
  const visibleFields = () => applied.filter((f) => !f.hidden).map(withCountryParts);
  const stepFields = (i) => {
    const s = base?.steps[i];
    return s ? visibleFields().filter((f) => f.stepId === s.id) : visibleFields();
  };
  function adoptValues(next) {
    if (!base) {
      values = next;
      return;
    }
    let hiddenBefore = new Set(applied.filter((f) => f.hidden).map((f) => f.target));
    const cleared = [];
    for (let i = 0; i <= base.fields.length; i++) {
      applied = applyRules(base, next);
      const toClear = applied.filter((f) => f.hidden && !hiddenBefore.has(f.target));
      if (!toClear.length) break;
      next = { ...next };
      for (const f of toClear) {
        next[f.target] = emptyValue(f);
        cleared.push(f.target);
      }
      hiddenBefore = new Set(applied.filter((f) => f.hidden).map((f) => f.target));
    }
    values = next;
    if (cleared.length) {
      const kept = {};
      for (const [k, msg] of Object.entries(errors)) if (!cleared.includes(k.split("/")[0])) kept[k] = msg;
      errors = kept;
    }
  }
  function adopt(loaded) {
    base = loaded;
    empty = defaultValues(loaded.fields);
    applied = applyRules(loaded, empty);
    values = empty;
    errors = {};
    step = 0;
    loading = false;
    emit();
  }
  function setErrors(next) {
    errors = next;
    emit();
  }
  function focusError(formEl, key) {
    const target = key.split("/")[0];
    const field = applied.find((f) => f.target === target);
    const at = base?.steps.findIndex((s) => s.id === field?.stepId) ?? -1;
    if (at >= 0 && at !== step) {
      step = at;
      emit();
    }
    focusControl(formEl, key);
  }
  function ownedKeys(key, field) {
    return key.includes("/") ? [key] : field.control === "address" ? field.addressParts.map(({ sub }) => `${field.target}/${sub}`) : [field.target];
  }
  function validateFields(fields, formEl) {
    const found = errorsForForm(fields, values);
    const owned = new Set(fields.flatMap((f) => ownedKeys(f.target, f)));
    const next = {};
    for (const [k, msg] of Object.entries(errors)) if (!owned.has(k) && k !== FORM_ERROR) next[k] = msg;
    Object.assign(next, found);
    setErrors(next);
    const first = fields.flatMap((f) => ownedKeys(f.target, f)).find((k) => found[k]);
    if (first) focusError(formEl, first);
    return !first;
  }
  return {
    getState,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    start() {
      if (started) return;
      started = true;
      if (base) return;
      if (!formId) {
        loading = false;
        errors = { [FORM_ERROR]: "No formId \u2014 pass one from the seed's forms map." };
        emit();
        return;
      }
      const id2 = ++generation;
      loading = true;
      emit();
      getForm(formId).then((loaded) => {
        if (started && generation === id2) adopt(loaded);
      }).catch((e) => {
        if (!started || generation !== id2) return;
        loading = false;
        errors = { [FORM_ERROR]: e instanceof Error ? e.message : "Could not load the form." };
        emit();
      });
    },
    stop() {
      started = false;
      generation++;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    },
    setValues(next) {
      adoptValues(typeof next === "function" ? next(values) : next);
      emit();
    },
    setValue(target, value) {
      adoptValues({ ...values, [target]: value });
      emit();
    },
    validate(target) {
      if (!target) return validateFields(visibleFields(), null);
      const key = String(target);
      const field = visibleFields().find((f) => f.target === key.split("/")[0]);
      if (!field) return true;
      if (field.control === "url" && typeof values[field.target] === "string") {
        const fixed = normalizeUrl(values[field.target]);
        if (fixed !== values[field.target]) {
          values = { ...values, [field.target]: fixed };
        }
      }
      const owned = ownedKeys(key, field);
      const found = errorsForField(field, values);
      const next = { ...errors };
      for (const k of owned) {
        delete next[k];
        if (found[k]) next[k] = found[k];
      }
      setErrors(next);
      return owned.every((k) => !found[k]);
    },
    next(event) {
      event?.preventDefault?.();
      const formEl = event?.currentTarget ?? null;
      if (!base || step >= base.steps.length - 1) return false;
      if (!validateFields(stepFields(step), formEl)) return false;
      step += 1;
      emit();
      return true;
    },
    previous() {
      if (step > 0) {
        step -= 1;
        emit();
      }
    },
    goToStep(index) {
      if (base && index >= 0 && index < base.steps.length && index !== step) {
        step = index;
        emit();
      }
    },
    setCaptchaToken(token) {
      captchaToken = token;
    },
    reset() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      outcome = null;
      step = 0;
      emit();
    },
    async submit(event) {
      event?.preventDefault?.();
      const formEl = event?.currentTarget ?? null;
      if (!base) return false;
      const current = base;
      if (isClosed(current)) {
        setErrors({ [FORM_ERROR]: current.disabledMessage || "This form is no longer accepting submissions." });
        return false;
      }
      const currentFields = visibleFields();
      if (!validateFields(currentFields, formEl)) return false;
      loading = true;
      emit();
      try {
        const uploaded = await uploadFiles(current.id, currentFields, values);
        values = uploaded;
        emit();
        const submission = await createSubmission(current.id, toSubmissionValues(currentFields, uploaded), captchaToken ? { captchaToken } : {});
        errors = {};
        captchaToken = null;
        if (submission.checkoutId) {
          outcome = { submission, action: "CHECKOUT" };
          try {
            outcome.url = await checkoutUrl(submission.checkoutId);
          } catch (e) {
            errors = { [FORM_ERROR]: e instanceof Error ? e.message : "Checkout could not start." };
          }
        } else {
          const s = current.success;
          outcome = {
            submission,
            action: s.action,
            ...s.message ? { message: s.message } : {},
            ...s.durationSeconds ? { durationSeconds: s.durationSeconds } : {},
            ...s.redirectUrl ? { url: s.redirectUrl, newTab: s.newTab === true } : {}
          };
          if (s.durationSeconds && typeof setTimeout !== "undefined") {
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
              hideTimer = null;
              outcome = null;
              emit();
            }, s.durationSeconds * 1e3);
          }
        }
        adoptValues(empty);
        step = 0;
        return outcome;
      } catch (e) {
        const mapped = submissionErrors(e, currentFields);
        if (Object.keys(mapped).length) {
          errors = mapped;
          focusError(formEl, Object.keys(mapped)[0]);
        } else {
          errors = { [FORM_ERROR]: formLevelError(e, current) ?? (e instanceof Error ? e.message : "Could not send the form. Please try again.") };
        }
        return false;
      } finally {
        loading = false;
        emit();
      }
    }
  };
}
export {
  FORM_ERROR,
  createFormStore,
  otherText,
  otherValue
};
