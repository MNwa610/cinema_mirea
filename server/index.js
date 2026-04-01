require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const models = require('./models/models');
const cors = require('cors');
const router = require('./routes/index');

const PORT = process.env.PORT || 5050;

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', router);

app.get('/', (req, res) => {
    res.status(200).json({ message: 'WORKING!!!' });
});

const start = async () => {
    try {
        await sequelize.authenticate();
        const shouldAlter =
            String(process.env.DB_SYNC_ALTER || '').toLowerCase() === 'true' ||
            process.env.NODE_ENV !== 'production';

        await sequelize.sync(shouldAlter ? { alter: true } : undefined);
        app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
    } catch (error) {
        console.error('Server error:', error);
        process.exit(1); 
    }
};

start();