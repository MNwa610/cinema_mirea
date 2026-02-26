const sequelize=require('../db')
const { DataTypes } = require('sequelize');

const User = sequelize.define('users', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8)
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8)
    },
    role:{
        type: DataTypes.STRING,
        defaultValue: "USER"
    },
}, {
    timestamps: true
})

const Film = sequelize.define('films', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    posterUrl: {
        type: DataTypes.STRING
    },
    releaseDate: {
        type: DataTypes.DATEONLY
    },
    rating: {
        type: DataTypes.DECIMAL(3, 1),
        defaultValue: 0
    },
    genres: {
        type: DataTypes.ARRAY(DataTypes.STRING)
    },
    director: {
        type: DataTypes.STRING
    },
    actors: {
        type: DataTypes.ARRAY(DataTypes.STRING)
    },
    duration: {
        type: DataTypes.INTEGER
    },
    kinopoiskId: {
        type: DataTypes.INTEGER
    },
}, {
    timestamps: true
})

const Cinema = sequelize.define('cinemas', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    coordinates: {
        type: DataTypes.GEOGRAPHY('POINT'),
        allowNull: false
    },
    phoneNumber: {
        type: DataTypes.STRING
    },
    openHours: {
        type: DataTypes.JSONB
    },
}, {
    timestamps: true
})

const UserFilmRelationship = sequelize.define('user_film_relationships', {
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    film_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'films',
            key: 'id'
        }
    }
}, {
    timestamps: true
})

const UserCinemaRelationship = sequelize.define('user_cinema_relationships', {
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    cinema_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'cinemas',
            key: 'id'
        }
    }
}, {
    timestamps: true
})

const FilmCinemaRelationship = sequelize.define('film_cinema_relationships', {
    film_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'films',
            key: 'id'
        }
    },
    cinema_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'cinemas',
            key: 'id'
        }
    }
}, {
    timestamps: true
})

User.belongsToMany(Film, { through: UserFilmRelationship });
Film.belongsToMany(User, { through: UserFilmRelationship });

User.belongsToMany(Cinema, { through: UserCinemaRelationship });
Cinema.belongsToMany(User, { through: UserCinemaRelationship });

Film.belongsToMany(Cinema, { through: FilmCinemaRelationship });
Cinema.belongsToMany(Film, { through: FilmCinemaRelationship });

module.exports = {
    User, 
    Film, 
    Cinema,
    UserFilmRelationship,
    UserCinemaRelationship,
    FilmCinemaRelationship
}