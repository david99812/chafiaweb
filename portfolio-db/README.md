# Portfolio DB

Each category contains four film folders.

Edit `brief.json` inside each film folder to update the project detail page.

Put image files in that film's `images` folder, then reference them in `brief.json` with a relative path.

```json
"stills": ["images/film-still-01.jpg"],
"processStills": ["images/process-01.jpg"]
```

`stills` is used for the left film frame in the zoom/detail view and the film thumbnails in the gallery.
`processStills` is used for the image grid at the top of the right-side production process area.
Images inside `process[].images` are still rendered inside each individual production-process item.

For YouTube, paste either a full URL or an ID:

```json
"youtubeUrl": "https://youtu.be/mdNvtS1zrhg"
```
