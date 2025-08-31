const express = require('express');
const path = require('path');
const route = require('./routes/route');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieparser = require('cookie-parser');
const flash = require('connect-flash');
const session = require('express-session');
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv');
const User = require('./models/User');
const bcrypt = require("bcrypt")
dotenv.config()
const app = express();



// Session only for flash
app.use(session({
  secret: 'just_for_flash_only',
  resave: false,
  saveUninitialized: false,
}));

app.use(flash());
// Flash message variables accessible in views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.errors = req.flash('errors'); // Optional for validation arrays
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(morgan('tiny'));
app.use(cookieparser());
app.use('/', route);

app.use(async (req, res, next)=> {
    const token = req.cookies.token;
    let user = null;
  
    if (!token) {
      req.user = null;
      return res.render('404', { title: '404 Not Found', user });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
  
    if (decoded) {
        user = await User.findById(decoded.userId);
        if (!user) {
            req.user = null;
            return res.render('404', { title: '404 Not Found', user });
        }
    } else {
        req.clearCookie("token")
        res.clearCookie('token');
    }
    req.user = user;
    return res.render('404', { title: '404 Not Found', user });  // ⛔️ always ends here
})
// 404 handler
app.use((req, res) => {
    res.status(404).render('404', { title: '404 Not Found', user: req.user });
});

(async () => {
    try {
        await mongoose.connect(process.env.dbURL);
        console.log('✅ Connected to MongoDB');
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword'; // Use a strong default or env var
        const adminName = process.env.ADMIN_NAME || 'Root Admin';

        const existingAdmin = await User.findOne({ email: adminEmail, role: 'admin' });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10); // Hash the default password

            const rootAdmin = new User({
                name: adminName,
                email: adminEmail,
                password: hashedPassword,
                role: 'admin'
            });

            await rootAdmin.save();
            console.log('✨ Root Admin created successfully!');
            console.log(`Admin Email: ${adminEmail}`);
            console.log(`Admin Password: ${adminPassword} (Please change this in production!)`);
        } else {
            console.log('Root Admin already exists.');
        }

        app.listen(3000, () => {
            console.log(`🚀 Server running on http://localhost:3000`);
        });
    } catch (err) {
        console.error('❌ Error connecting to MongoDB or creating admin:', err);
    }
})();