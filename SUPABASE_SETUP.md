# Supabase einrichten

## 1. Projekt anlegen

1. Unter [supabase.com](https://supabase.com) ein neues Projekt erstellen.
2. Im SQL Editor den kompletten Inhalt von `database.sql` ausführen.
3. Unter **Project Settings → API** die Project URL und den Publishable Key kopieren.
4. Diese beiden Werte in `config.js` eintragen:

```js
window.PARKKONTAKT_CONFIG = {
  supabaseUrl: "https://DEIN-PROJEKT.supabase.co",
  supabasePublishableKey: "DEIN-PUBLISHABLE-KEY"
};
```

Der Publishable Key darf im Frontend stehen. Ein `service_role`-Key darf niemals in diese Datei gelangen.

## 2. E-Mail-Anmeldung aktivieren

In Supabase unter **Authentication → Providers → Email** den E-Mail-Provider aktivieren. Die Besitzer melden sich anschließend über `auth.html` an. Fahrzeuge werden mit ihrer Benutzer-ID gespeichert und sind im Dashboard nur für den jeweiligen Besitzer sichtbar.

## 3. Anwendung veröffentlichen

Die HTML-Dateien können auf jedem HTTPS-fähigen statischen Hosting veröffentlicht werden, zum Beispiel GitHub Pages, Netlify oder Vercel. Die URL muss dauerhaft bleiben, weil sie in den QR-Codes gespeichert wird.

Der QR-Code enthält eine URL wie:

```text
https://deine-domain.example/message.html?vehicle=<fahrzeug-id>
```

Beim Aufruf werden die öffentlichen Fahrzeugdaten aus Supabase geladen. Die Nachricht wird anonym in `messages` gespeichert; die E-Mail-Adresse des Besitzers wird niemals an den Absender ausgeliefert.

## 4. Nachrichtenbenachrichtigungen

Die Datenbankintegration speichert Nachrichten sofort. Für E-Mail- oder Push-Benachrichtigungen sollte anschließend eine serverseitige Supabase Edge Function ergänzt werden. Sie kann auf neue `messages` reagieren und über einen Anbieter wie Resend senden. Geheimnisse wie der Resend-API-Key gehören ausschließlich in Supabase Secrets, nicht in `config.js`.

## Lokaler Demo-Modus

Wenn `config.js` leer bleibt, funktioniert die bisherige lokale Demo mit `localStorage` weiter. Fahrzeuge und Nachrichten sind dann nicht zwischen Geräten synchronisiert und nicht für echte Produktion geeignet.
