# Афиша кинотеатров

Полнофункциональное приложение для просмотра кинотеатров, фильмов и выбора сеансов.

## Структура проекта

- `server/` - Backend на Node.js + Express + Sequelize + PostgreSQL
- `client/` - Frontend на React + Vite

## Запуск проекта

### Быстрый старт (рекомендуется)

1. Установите все зависимости из корня проекта:
```bash
npm run install:all
```

2. Настройте переменные окружения в файле `server/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret_key
PORT=5050
```

3. Запустите оба сервера одновременно:
```bash
npm run dev
```

- Backend будет доступен на http://localhost:5050
- Frontend будет доступен на http://localhost:3000

### Запуск по отдельности

#### Backend

1. Перейдите в папку server:
```bash
cd server
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте переменные окружения в файле `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret_key
PORT=5050
```

4. Запустите сервер:
```bash
npm run dev
```

Backend будет доступен на http://localhost:5050

#### Frontend

1. Перейдите в папку client:
```bash
cd client
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите dev сервер:
```bash
npm run dev
```

Frontend будет доступен на http://localhost:3000

## Функционал

- ✅ Регистрация и авторизация пользователей
- ✅ Просмотр списка кинотеатров поблизости
- ✅ Выбор кинотеатра и просмотр доступных фильмов
- ✅ Детальная информация о фильмах
- ✅ Выбор сеансов
- ✅ Места для подключения карт (API для карт нужно подключить отдельно)
- ✅ Современный дизайн в синем, белом и черном цветах

## API Endpoints

### Пользователи
- `POST /api/user/registration` - Регистрация
- `POST /api/user/login` - Вход
- `GET /api/user/auth` - Проверка авторизации (требует токен)
- `GET /api/user/profile` - Профиль пользователя (требует токен)

### Кинотеатры
- `GET /api/cinema/` - Список всех кинотеатров
- `GET /api/cinema/:cinemaId` - Информация о кинотеатре

### Фильмы
- `GET /api/film/` - Список всех фильмов
- `GET /api/film/:filmId` - Информация о фильме

## Технологии

### Backend
- Node.js
- Express.js
- Sequelize ORM
- PostgreSQL
- JWT для авторизации
- bcrypt для хеширования паролей

### Frontend
- React 18
- React Router DOM
- Axios
- Vite
- CSS3
