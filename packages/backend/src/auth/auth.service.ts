import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import * as bcrypt from "bcryptjs";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { User, UserDocument } from "../schemas/user.schema";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.userModel.exists({ email });

    if (existingUser) {
      throw new ConflictException({
        message: "Email is already registered",
        errors: {
          email: ["Email is already registered"],
        },
      });
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);
    const user = await this.userModel.create({
      email,
      passwordHash,
      workspaceName: this.resolveWorkspaceName(registerDto),
      tokenVersion: 0,
    });

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.buildAuthResponse(user);
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { tokenVersion: 1 },
    });

    return {
      success: true,
      message: "Logged out successfully",
    };
  }

  async me(userId: string) {
    const user = await this.userModel.findById(userId).lean();

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    return {
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        workspaceName: user.workspaceName,
      },
    };
  }

  private async buildAuthResponse(user: UserDocument) {
    const accessToken = await this.signAccessToken(user);

    return {
      success: true,
      data: {
        accessToken,
        expiresIn: this.configService.get<string>("jwtExpiresIn") ?? "1d",
        user: {
          id: user.id,
          email: user.email,
          workspaceName: user.workspaceName,
        },
      },
    };
  }

  private async signAccessToken(user: UserDocument) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion ?? 0,
    };

    return this.jwtService.signAsync(payload);
  }

  private resolveWorkspaceName(registerDto: RegisterDto) {
    const trimmedWorkspaceName = registerDto.workspaceName?.trim();
    if (trimmedWorkspaceName) {
      return trimmedWorkspaceName;
    }

    const emailPrefix = registerDto.email.split("@")[0]?.trim();
    if (emailPrefix) {
      return `${emailPrefix}'s Workspace`;
    }

    return "Owner Workspace";
  }
}
