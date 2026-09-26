/**
 * YouTube facade (spec-design-content §3, JS inventory 4). Upgrades each `a.yt` link (local
 * poster, no YouTube requests) to a button with the same look; a click swaps in the
 * youtube-nocookie player, autoplaying, and moves focus to it. Without JS the link simply
 * opens the video on YouTube.
 */
for (const link of document.querySelectorAll<HTMLAnchorElement>('a.yt[data-yt-id]')) {
  const button = document.createElement('button');
  button.type = 'button';
  for (const { name, value } of link.attributes) {
    if (name !== 'href') button.setAttribute(name, value);
  }
  button.append(...link.childNodes);
  link.replaceWith(button);

  button.addEventListener(
    'click',
    () => {
      const { ytId = '', ytTitle, ytStart } = button.dataset;
      const params = new URLSearchParams({ autoplay: '1', rel: '0' });
      if (ytStart) params.set('start', ytStart);

      const player = document.createElement('iframe');
      player.className = 'yt-player';
      player.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?${params}`;
      player.title = ytTitle || 'YouTube video';
      player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      player.allowFullscreen = true;
      button.replaceWith(player);
      player.focus();
    },
    { once: true },
  );
}
