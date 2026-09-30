# Enquête "Keuzevrijheid onder maatschappelijke druk"

Een eigen enquêtewebsite (GitHub Pages) met:

- **`index.html`** – de enquête (zelfde vragen als het Google Form). Wie jonger is dan 18 of geen toestemming geeft, stopt meteen. Aan het eind: *Nee* → enquête afgesloten; *Ja* → nieuwe pagina om naam en e-mailadres achter te laten.
- **`resultaten.html`** – een dashboard met wachtwoord: beschrijvende statistiek, Cronbach's α, KMO & Bartlett, factoranalyse, correlaties, kruistabellen, ANOVA, regressie, PROCESS Model 6, open antwoorden en CSV-export.
- **`apps-script/Code.gs`** – het kleine "servertje" dat de antwoorden opslaat in Google Sheets.

Contactgegevens voor het interview komen in een **aparte spreadsheet**, zonder tijdstip (alleen de datum) en zonder koppelcode. Zo zijn ze niet aan de enquête-antwoorden te koppelen.

---

## Stap 1 – Google Sheet + Apps Script (± 10 minuten)

1. Ga naar [sheets.new](https://sheets.new) en noem de spreadsheet bijvoorbeeld *Enquête hoofddoek – antwoorden*.
2. Menu **Extensies → Apps Script**.
3. Verwijder de voorbeeldcode, plak de volledige inhoud van `apps-script/Code.gs` en klik op **Opslaan** (💾).
4. Kies bovenin de functie **`setup`** en klik op **Uitvoeren**. Geef toestemming wanneer Google daarom vraagt (*Geavanceerd → Ga naar … (onveilig)* is normaal bij je eigen script).
   - Er verschijnt nu een nieuwe spreadsheet **"Interview-aanmeldingen (apart van enquête)"** in je Google Drive.
5. Klik links op **⚙ Projectinstellingen → Script-eigenschappen**. Verander de waarde van `RESULTS_PASSWORD` van `VERANDER-MIJ` in een eigen, sterk wachtwoord.
6. Klik rechtsboven op **Implementeren → Nieuwe implementatie**:
   - Type: **Web-app**
   - Uitvoeren als: **Ik**
   - Wie heeft toegang: **Iedereen**
   - Klik **Implementeren** en kopieer de **Web-app-URL** (eindigt op `/exec`).

## Stap 2 – URL invullen

Open `config.js` en plak de URL:

```js
APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfy..../exec",
CONTACT_EMAIL: "jouw@email.nl"   // optioneel, wordt op de bedankpagina getoond
```

## Stap 3 – Online zetten met GitHub Pages

1. Maak een account op [github.com](https://github.com) (als je dat nog niet hebt).
2. Klik op **New repository**, naam bijv. `enquete-hoofddoek`, zet hem op **Public** en klik **Create repository**.
3. Klik op **uploading an existing file** en sleep **alle bestanden en de map `apps-script`** uit deze map erin. Klik **Commit changes**.
4. Ga naar **Settings → Pages**. Kies bij *Source*: **Deploy from a branch**, branch **main**, map **/ (root)** → **Save**.
5. Na 1–2 minuten staat de enquête op
   `https://<jouw-gebruikersnaam>.github.io/enquete-hoofddoek/`
   en de resultaten op
   `https://<jouw-gebruikersnaam>.github.io/enquete-hoofddoek/resultaten.html`

> De code is openbaar, de antwoorden niet: die staan alleen in jouw Google Sheet en zijn alleen via het wachtwoord op te vragen.

## Stap 4 – Testen

1. Vul de enquête één keer in (kies *Ja* voor het interview) en controleer of er een rij verschijnt in het tabblad **Antwoorden** en in de aparte interview-spreadsheet.
2. Open `resultaten.html`, log in met je wachtwoord.
3. Verwijder de testrijen uit beide spreadsheets vóórdat je de link verspreidt.

Tip: via **Voorbeelddata bekijken** op de inlogpagina kun je het hele dashboard al bekijken met gesimuleerde data (niet voor rapportage!).

## Op je eigen website plaatsen

Deel gewoon de link, of sluit de enquête in met:

```html
<iframe src="https://<jouw-gebruikersnaam>.github.io/enquete-hoofddoek/" style="width:100%;height:1400px;border:0" title="Enquête"></iframe>
```

## Iets aanpassen?

- **Vragen/tekst**: alles staat in `questions.js` (wordt door de enquête én het dashboard gebruikt).
- **Apps Script gewijzigd?** Ga naar *Implementeren → Implementaties beheren → ✏ → Versie: Nieuwe versie → Implementeren*. De URL blijft gelijk.
- **Ander wachtwoord**: pas `RESULTS_PASSWORD` aan in de Script-eigenschappen (geen nieuwe implementatie nodig).

## Over de analyses

| Analyse | Details |
|---|---|
| Schaalscores | Gemiddelde van de items; alleen berekend als alle items van de schaal zijn ingevuld. Likert 1–5 (oneens → eens), discriminatie 1–6 (nooit → bijna dagelijks). |
| Betrouwbaarheid | Cronbach's α, gestandaardiseerde α, McDonald's ω, r<sub>it</sub>, α-als-item-verwijderd |
| Factoranalyse | KMO (+ MSA per item), Bartlett, principal axis factoring, promax/varimax, screeplot + parallelle analyse |
| Kruistabellen | χ², Cramér's V, waarschuwing bij verwachte frequenties < 5 |
| Groepsverschillen | Eenweg-ANOVA, η² (bij 2 groepen ook t en Cohen's d) |
| Regressie | B, SE, β, t, p, 95%-BI, R², VIF |
| PROCESS Model 6 | X → M1 → M2 → Y met optionele covariaten; alle paden + percentiel-bootstrap (1.000–10.000) voor de drie specifieke en het totale indirecte effect |

Alle berekeningen zijn gecontroleerd tegen R en Python (verschillen < 10⁻¹²). Controleer je eindrapportage bij voorkeur nog in SPSS met de PROCESS-macro van Hayes; bootstrapgrenzen verschillen door toeval altijd een klein beetje.
