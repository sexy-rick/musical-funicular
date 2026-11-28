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
</section>
<?php pageFooter(); ?>
