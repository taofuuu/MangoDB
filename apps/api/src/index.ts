import { PORT } from './env';
import { createApp } from './app';

createApp().listen(PORT, () => {
    console.log(`api listening on http://localhost:${PORT}`);
});
