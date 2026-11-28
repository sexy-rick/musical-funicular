<?php
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/view.php';
pageHeader('Download Alium for Android');
?>
<section class="alium-page" aria-labelledby="alium-title">
  <div class="alium-hero">
    <div class="alium-hero-copy">
      <p class="alium-kicker">ALIUM BY MARKETPLACE TRADER</p>
      <h1 id="alium-title">Your catalog,<br>in your pocket.</h1>
      <p class="alium-intro">Discover Minecraft Bedrock content and download through your own Telegram account.</p>
      <div class="alium-version"><span>Android</span><span>Beta 0.1.0</span><span>Android 7.0+</span></div>
      <div class="alium-actions"><a class="btn alium-download" href="https://github.com/Alchemiisst/Alium/releases/download/v0.1.0/app-release.apk">Download Alium for Android</a><a class="alium-release-link" href="https://github.com/Alchemiisst/Alium/releases">View GitHub releases</a></div>
      <p class="alium-download-note">APK download · Version 0.1.0 beta</p>
    </div>
    <img class="alium-icon" src="/assets/alium-icon.png" width="1024" height="1024" alt="Alium flower app icon">
  </div>
  <div class="alium-sections">
    <section class="alium-panel alium-overview" aria-labelledby="alium-about-title">
      <p class="alium-eyebrow">MEET ALIUM</p>
      <h2 id="alium-about-title">The collection, made mobile.</h2>
      <p>Explore add-ons, textures, skins and worlds for Minecraft Bedrock. Find a listing and continue with your own Telegram account.</p>
      <div class="alium-facts"><div><strong>Browse the catalog</strong><span>Search and explore listings.</span></div><div><strong>Use your account</strong><span>Sign in with your own account.</span></div><div><strong>Continue your way</strong><span>Open compatible files on your device.</span></div></div>
    </section>
    <section class="alium-panel alium-steps" aria-labelledby="alium-install-title">
      <p class="alium-eyebrow">GET STARTED</p><h2 id="alium-install-title">Install Alium</h2>
      <ol><li>Download the Android APK above.</li><li>Open the downloaded file. If Android asks, allow installation from that source.</li><li>Confirm installation, then open Alium and sign in with your own Telegram account.</li></ol>
      <p>Alium is in beta. Availability and compatibility can vary by device and file.</p>
      <a class="alium-help" href="/faq.php">Visit Help &amp; FAQ</a>
    </section>
  </div>
  <section class="alium-panel web-install" id="install-website" aria-labelledby="web-install-title">
    <p class="alium-eyebrow">CHROME WEBSITE APP</p>
    <h2 id="web-install-title">Install the website</h2>
    <p>Add Marketplace Trader to your device using Chrome. This installs the website, not the Alium Android app; add-on downloads still open Telegram.</p>
    <button id="web-install-button" class="btn web-install-button" type="button" hidden>Install website app</button>
    <p id="web-install-status" role="status" aria-live="polite"></p>
    <div class="web-install-instructions">
      <p><strong>Chrome on Android:</strong> Open Chrome’s menu, then select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
      <p><strong>Chrome on computer:</strong> Use the install icon in the address bar, or look for an install option in Chrome’s menu. Menu names vary by version.</p>
      <p>If an install option is not available, continue using the website in your browser. Internet access is required.</p>
    </div>
  </section>
  <script src="/assets/install-v15.js" defer></script>
</section>
<?php pageFooter(); ?>
