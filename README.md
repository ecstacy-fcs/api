# Ecstacy API

The server side code of Ecstacy, a secure e-commerce web application developed primarily to facilitate buying and selling of products between users.

## Getting Started

To run the Ecstacy API locally,

Clone this repo

```zsh
git clone https://github.com/ecstacy-fcs/api.git
```

Go to the project directory and install dependencies

```zsh
cd api
npm install
```

You will need to add the following environment variables to your .env file.

`PORT`

`DATABASE_URL`

`CLIENT_ORIGIN`

`API_BASE_URL`

`SESSION_NAME`

`COOKIE_SECRET`

`UPLOADS_ROOT`

`SENDGRID_API_KEY`

`RAZORPAY_API_TEST_USERNAME`

`RAZORPAY_API_TEST_PASSWORD`

`RAZORPAY_API_LIVE_USERNAME`

`RAZORPAY_API_LIVE_PASSWORD`

Refer to [.env.example](.env.example) for example environment variables.

Run the development server

```zsh
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) with your browser to a message that the API is listening at port 5000.

The app uses Razorpay in test mode. To use the live mode, change all instances of `RAZORPAY_API_TEST_USERNAME` to `RAZORPAY_API_LIVE_USERNAME` and `RAZORPAY_API_TEST_PASSWORD` to `RAZORPAY_API_LIVE_PASSWORD`.

To run the Ecstacy web application (both API and client) locally, and for more extensive documentation, refer to the complete guide [here.](https://github.com/ecstacy-fcs/client#readme)

## Authors

This project was developed by **MDMA**

- [Meetakshi Setiya](https://www.github.com/meetakshi253)
- [Dev Rajput](https://www.github.com/thesantatitan)
- [Mihir Chaturvedi](https://www.github.com/plibither8)
- [Ananya Lohani](https://www.github.com/ananyalohani)

## License

[MIT](LICENSE)
