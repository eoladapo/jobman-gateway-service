import { Signup } from '@gateway/controllers/auth/signup';
import express, { Router } from 'express';

class AuthRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.post('/auth/signup', Signup.prototype.create);
    return this.router
  }
}

export const authRoutes: AuthRoutes = new AuthRoutes();
