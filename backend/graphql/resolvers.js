const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const { clearImage } = require('../util/file');

const User = require('../models/user')
const Post = require('../models/post')

//
// note async ({ field }, { req, res }) => { ... }
//
// field is args, req is context, as defined in app.js
//
module.exports = {

  createUser: async ({ userInput }, { req }) => {
    const errors = [];
    const email = userInput.email;
    if (!validator.isEmail(email)) {
      errors.push({ message: 'Email is invalid.'});
    }
    const name = userInput.name;
    const password = userInput.password;
    if (validator.isEmpty(password) || !validator.isLength(password, { min: 5 })) {
      errors.push({ message: 'Password too short.' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User already exists!');
      throw error;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ email, name, password: hashedPassword });
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() }
    // graphiql test query...
    // mutation {
    //   createUser(userInput: {
    //     email: "test@test.com",
    //     password: "tester",
    //     name: "Test"
    //   }) {
    //     _id
    //     email
    //   }
    // }
  },

  login: async ({ email, password }, { req }) => {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error('User not found.');
      error.code = 404;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error('Password is incorrect.');
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email
      },
      'secret-key-here',
      { expiresIn: '1h' }
    );
    return { token, userId: user._id.toString() };
    // graphiql test query...
    // query {
    //   login(email: "test@test.com", password: "tester") {
    //     token
    //     userId
    //   }
    // }
  },

  createPost: async ({ postInput }, { req }) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    const errors = [];
    const title = postInput.title;
    const content = postInput.content;
    const imageUrl = postInput.imageUrl;
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: 'Title is invalid.' });
    }
    if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 })) {
      errors.push({ message: 'Content is invalid.' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found.');
      error.data = errors;
      error.code = 404;
      throw error;
    }
    const post = new Post({
      title,
      content,
      imageUrl,
      creator: user
    });
    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString()
    };
    // graphiql test query...
    // mutation {
    //   createPost(postInput:{
    //     title: "Panda",
    //     content: "A Panda wearing a trilby",
    //     imageUrl: "image url"
    //   }) {
    //     _id
    //     title
    //   }
    // }
  },

  posts: async ({ page }, { req }) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    if (!page) {
      page = 1;
    }
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('creator');
    return {
      posts: posts.map(p => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString()
        };
      }),
      totalPosts
    };
    // graphiql test query...
    // (won't work in graphiql since there's no token being sent)
    // query {
    //   posts {
    //     posts {
    //       _id
    //       title
    //       content
    //     }
    //     totalPosts
    //   }
    // }
  },

  post: async ({ id }, { req }) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      const error = new Error('No post found!!');
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
    // graphiql test query...
    // (won't work in graphiql since there's no token being sent)
    // query {
    //   post(id: "<post-id-here>") {
    //     title
    //     content
    //     imageUrl
    //     creator { name }
    //     createdAt
    //   }
    // }
  },

  updatePost: async ({ id, postInput }, { req }) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      const error = new Error('No post found!!');
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('Not authorized!!');
      error.code = 403;
      throw error;
    }
    const errors = [];
    const title = postInput.title;
    const content = postInput.content;
    const imageUrl = postInput.imageUrl;
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: 'Title is invalid.' });
    }
    if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 })) {
      errors.push({ message: 'Content is invalid.' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    post.title = title;
    post.content = content;
    if (imageUrl !== 'undefined') { // sent as text from the frontend
      post.imageUrl = imageUrl;
    }
    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString()
    };
    // graphiql test query...
    // mutation {
    //   createPost(postInput:{
    //     title: "Panda",
    //     content: "A Panda wearing a trilby",
    //     imageUrl: "image url"
    //   }) {
    //     _id
    //     title
    //   }
    // }
  },

  deletePost: async ({ id }, { req }) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id);
    if (!post) {
      const error = new Error('No post found!!');
      error.code = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error('Not authorized!');
      error.code = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndDelete(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  },

  user: async (args, { req }) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found.');
      error.code = 404;
      throw error;
    }
    return {
      ...user._doc,
      _id: user._id.toString()
    };
  },

  updateStatus: async ({ status }, { req }) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found.');
      error.code = 404;
      throw error;
    }
    user.status = status;
    await user.save();
    return {
      ...user._doc,
      _id: user._id.toString()
    };
  },

};
