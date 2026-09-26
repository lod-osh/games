const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const auth = require('./middleware/auth');

const wizardRoutes = require('./routes/wizard');
const locationRoutes = require('./routes/location');
const npcRoutes = require('./routes/npc');
const spellRoutes = require('./routes/spells');

const app = express();
app.use(cors());
app.use(express.json());

// Docs are reachable without an API key — browsing the API shouldn't
// require already having a wizard.
const openapiDocument = yaml.load(
  fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8')
);

app.get('/', (req, res) => {
  res.json({
    name: 'Wizard API Game',
    docs: '/docs',
    hint: 'POST /wizard with {"name": "..."} to begin.'
  });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.use(auth);

app.use(wizardRoutes);
app.use(locationRoutes);
app.use(npcRoutes);
app.use(spellRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Wizard API game listening on http://localhost:${PORT}`);
});
