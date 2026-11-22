# Secret Santa

A static Secret Santa that gives every person their own private link.

- `index.html` is the page everyone opens. The code after the `#` in their link
  unlocks their envelope in the browser. Nothing is decrypted on a server, and
  the code never leaves the browser.
- `data.json` holds one AES-256-GCM encrypted entry per person, keyed from their
  code. Without the code the file says only how many people took part.
- `draw.mjs` runs the draw and writes `data.json`. It needs Node 18 or newer.

## Running a draw

1. Put one name per line in a file that is **not** committed, e.g. `names.txt`.
2. Run the draw from the repository root:

   ```sh
   node santa/draw.mjs --names names.txt --title "Family Secret Santa" \
     --budget "£25" --date 2026-12-20 --exclude "Alex|Priya"
   ```

   `--exclude "A|B"` keeps a pair from drawing each other (repeat it for more
   pairs). `--base` sets the public URL of this folder if it is not the default.
   `--links links.csv` also writes the links to a file. `--show-matches` prints
   who got whom, which you normally do not want to see.

3. Commit `santa/data.json` and publish. The links work once the page is live.
4. Send each person their link. Keep the list of links private: a link is the
   only key to its envelope.

Every draw is a single circle, so nobody gets themselves and no two people get
each other. Running the draw again replaces every envelope and every link.
