import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "../../schemas/user.schema";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Authentication required");
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.userModel.findById(payload.sub).lean();

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException("Authentication required");
      }

      request.user = {
        id: user._id.toString(),
        email: user.email,
        workspaceName: user.workspaceName,
        tokenVersion: user.tokenVersion,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Authentication required");
    }
  }
}
