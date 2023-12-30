# overforingsbrev-igjen
Nodejs script that handles overforingsbrev for employees

# Flows
## Overføringsbrev
Oppretter et dokument per ansatt som skal få overføringsbrev fra csv-fil.
Flytt over dokumentene til queue for riktig fylke. Kjør handle-queue for begge fylker, og nyt resultatet

## SyncPrivatePerson for employee
Oppretter privateperson for en ansatt i arkiv dersom 

# Flyt

## ./jobs/handle-queue
[./jobs/handle-queue.js](./jobs/handle-queue.js)
- Henter klare jobber for et gitt fylkes queue mappe (sjekker om tidspunket i property nextRun er passert), for hvert dokument
  - Henter korrekt flow for den gitte dokumenttypen (matches mot filene i ./flows-mappa)
  - Sender dokumentet og flow videre til ./jobs/handle-document.js

## ./jobs/handle-document
[./jobs/handle-document.js](./jobs/handle-document.js)
- Sjekker hvilke oppgaver som skal gjennomføres på dokumentet basert på flow, og prøver å kjøre disse sekvensielt.
- Dersom en av jobbene feiler (f. eks deadlock i jobben archive)
  - Stoppes kjøringen av dette dokumentet
  - Antall runs inkrementeres
  - Status for kjøringen så langt lagres (slik at den kan plukke opp igjen der den slapp, når den prøver neste gang)
  - Error logger, og varsles til Teams (dersom man ønsker)
  - Dersom dokumentet har kjørt for mange ganger, legges det i failed-mappen

### Jobber som kan sjekkes / kjøres i ./jobs/handle-document (i sekvensiell rekkefølge)
TODO: Legg til mulighe jobber

#### stats
Oppretter et statistikk-element i felles statistikk-database (basert på hvilket fylke dokumentet tilhører)

#### finishDocument
**Kjører uavhengig av hva som er satt opp i flow for dokumentet**. Sjekkes / kjøres som siste jobb, når alle foregående jobber er fullført. Setter finishedTimestamp og flytter dokumentet til finished.

## ./jobs/delete-finished-documents
[./jobs/delete-finished-documents.js](./jobs/delete-finished-documents.js)
- For hvert dokument som ligger i finished-mappe
- Dersom dokumentetes finishedTimestamp-dato er over miljøvariabel DELETE_FINISHED_AFTER_DAYS (default 30) dager gammel, så slettes dokumentet.
- Ellers blir det liggende

# Scripts


# Oppsett av løsningen
Klon ned prosjektet der det skal kjøre (lettest å klone det rett inn i VSCode)
```bash
git clone {url til repo}
```
Åpne prosjektet der du klona det ned
```bash
cd {path til klona repo}
```
Installer dependencies
```bash
npm i
```
Lag deg en .env fil med følgende verdier


## Kjør / test
For å kjøre eller teste brukes scriptene i [./scripts](./scripts/)

Kjøres på følgende måte **(HUSK Å KJØRE FRA PROSJEKTETS ROT FOR Å FÅ MED .env)**:
```bash
node ./scripts/{script-navn}.js
```

## Logger
Logger opprettes automatisk og finnes i [./logs](./logs/). Det opprettes en ny loggfil per mnd

# Oppdateringer
Gjør de endringer som trengs, test at ting fungerer lokal eller i test-miljø. Sync så endringer ned til produksjonsområdet.

TODO: Lag fancy funksjonalitet for nye releases og oppdateringer.

