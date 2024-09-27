const router = require("express").Router();
const { UserModel, validate } = require("../Model/user");
const bcrypt = require("bcrypt");

router.post("/", async (req, res) => {
	try {
		const { error } = validate(req.body);
		if (error)
			return res.status(400).send({ message: error.details[0].message });

		// Check if the email already exists
		const emailExists = await UserModel.findOne({ email: req.body.email });
		if (emailExists)
			return res
				.status(409)
				.send({ message: "User with the given email already exists!" });

		// Check if the username already exists
		const usernameExists = await UserModel.findOne({ username: req.body.username });
		if (usernameExists)
			return res
				.status(409)
				.send({ message: "Username already exists!" });

		const salt = await bcrypt.genSalt(Number(process.env.SALT));
		const hashPassword = await bcrypt.hash(req.body.password, salt);

		await new UserModel({ ...req.body, password: hashPassword }).save();
		res.status(201).send({ message: "User created successfully" });
	} catch (error) {
		res.status(500).send({ message: "Internal Server Error" });
	}
});

module.exports = router;
