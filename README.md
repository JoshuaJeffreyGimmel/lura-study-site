# Lura Study — website

The static website for [Lura Study](https://github.com/JoshuaJeffreyGimmel/lura-study),
a local-first study app for your own material. Served at
<https://lura-study.joshuagimmel.com/>.

Plain HTML, CSS and one small script for the copy buttons and the motion layer. No build
step, no framework, no cookies, no analytics, no trackers. Without JavaScript every section
is visible, and with `prefers-reduced-motion: reduce` the reveals, tilt, marquee movement
and smooth scrolling are off. Fonts (Silkscreen, IBM Plex Sans, IBM Plex Mono)
are self-hosted under the SIL Open Font License; see `assets/fonts/`.

## Preview locally

```sh
python3 -m http.server 8080
```

Then open <http://localhost:8080/>.

## License

MIT — see [LICENSE](LICENSE). The app's source code lives at
<https://github.com/JoshuaJeffreyGimmel/lura-study>.
