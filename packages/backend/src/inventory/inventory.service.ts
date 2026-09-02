import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { Invoice, InvoiceDocument } from "../schemas/invoice.schema";
import { Product, ProductDocument } from "../schemas/product.schema";
import { CreateProductDto } from "./dto/create-product.dto";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

type ProductObject = Product & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  async create(userId: string, createProductDto: CreateProductDto) {
    await this.ensureSkuIsAvailable(userId, createProductDto.sku);

    try {
      const product = await this.productModel.create({
        ownerId: new Types.ObjectId(userId),
        sku: createProductDto.sku,
        name: createProductDto.name,
        description: createProductDto.description ?? "",
        unitPrice: createProductDto.unitPrice,
        quantityOnHand: createProductDto.quantityOnHand,
      });

      return {
        success: true,
        data: this.toProductResponse(product),
      };
    } catch (error) {
      this.rethrowDuplicateSkuError(error);
      throw error;
    }
  }

  async list(userId: string, query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 8;
    const search = query.search?.trim() ?? "";

    const filters: FilterQuery<ProductDocument> = {
      ownerId: new Types.ObjectId(userId),
    };

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const totalItems = await this.productModel.countDocuments(filters);
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / limit);
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const products = await this.productModel
      .find(filters)
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    return {
      success: true,
      data: {
        items: products.map((product) => this.toProductResponse(product)),
        pagination: {
          page: safePage,
          limit,
          totalItems,
          totalPages,
          hasNextPage: safePage < totalPages,
          hasPreviousPage: safePage > 1,
        },
        filters: {
          search,
        },
      },
    };
  }

  async catalog(userId: string) {
    const products = await this.productModel
      .find({
        ownerId: new Types.ObjectId(userId),
      })
      .sort({ name: 1, sku: 1, _id: 1 });

    return {
      success: true,
      data: {
        items: products.map((product) => this.toProductResponse(product)),
      },
    };
  }

  async getSuggestedSku(userId: string) {
    const products = await this.productModel
      .find({
        ownerId: new Types.ObjectId(userId),
        sku: { $regex: "^SKU-[0-9]+$", $options: "i" },
      })
      .select({ sku: 1, _id: 0 })
      .lean();

    let maxSkuNumber = 0;

    for (const product of products) {
      const match = /^SKU-(\d+)$/i.exec(product.sku);
      if (!match) {
        continue;
      }

      const skuNumber = Number(match[1]);
      if (Number.isFinite(skuNumber) && skuNumber > maxSkuNumber) {
        maxSkuNumber = skuNumber;
      }
    }

    return {
      success: true,
      data: {
        sku: `SKU-${String(maxSkuNumber + 1).padStart(3, "0")}`,
      },
    };
  }

  async getOne(userId: string, productId: string) {
    const product = await this.findOwnedProductOrFail(userId, productId);

    return {
      success: true,
      data: this.toProductResponse(product),
    };
  }

  async update(userId: string, productId: string, updateProductDto: UpdateProductDto) {
    const product = await this.findOwnedProductOrFail(userId, productId);

    if (
      updateProductDto.sku &&
      updateProductDto.sku !== product.sku
    ) {
      await this.ensureSkuIsAvailable(userId, updateProductDto.sku, product.id);
    }

    product.sku = updateProductDto.sku ?? product.sku;
    product.name = updateProductDto.name ?? product.name;
    product.description = updateProductDto.description ?? product.description;
    product.unitPrice = updateProductDto.unitPrice ?? product.unitPrice;
    product.quantityOnHand = updateProductDto.quantityOnHand ?? product.quantityOnHand;

    try {
      await product.save();
      return {
        success: true,
        data: this.toProductResponse(product),
      };
    } catch (error) {
      this.rethrowDuplicateSkuError(error);
      throw error;
    }
  }

  async remove(userId: string, productId: string) {
    const product = await this.findOwnedProductOrFail(userId, productId);
    const ownerObjectId = new Types.ObjectId(userId);

    const referencedInvoice = await this.invoiceModel.exists({
      ownerId: ownerObjectId,
      "items.productId": product._id,
    });

    if (referencedInvoice) {
      throw new ConflictException({
        message: "This product is already referenced by an invoice and cannot be deleted.",
      });
    }

    await product.deleteOne();

    return {
      success: true,
      message: "Product deleted successfully",
    };
  }

  private async findOwnedProductOrFail(userId: string, productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException("Invalid product id");
    }

    const product = await this.productModel.findOne({
      _id: productId,
      ownerId: new Types.ObjectId(userId),
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  private async ensureSkuIsAvailable(userId: string, sku: string, excludeProductId?: string) {
    const filters: FilterQuery<ProductDocument> = {
      ownerId: new Types.ObjectId(userId),
      sku,
    };

    if (excludeProductId && Types.ObjectId.isValid(excludeProductId)) {
      filters._id = { $ne: new Types.ObjectId(excludeProductId) };
    }

    const existingProduct = await this.productModel.exists(filters);
    if (existingProduct) {
      throw new UnprocessableEntityException({
        message: "Validation failed",
        errors: {
          sku: ["SKU already exist."],
        },
      });
    }
  }

  private rethrowDuplicateSkuError(error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new UnprocessableEntityException({
        message: "Validation failed",
        errors: {
          sku: ["SKU already exist."],
        },
      });
    }
  }

  private toProductResponse(product: ProductDocument) {
    const source = product.toObject() as ProductObject;

    return {
      id: source._id.toString(),
      sku: source.sku,
      name: source.name,
      description: source.description,
      unitPrice: source.unitPrice,
      quantityOnHand: source.quantityOnHand,
      createdAt: source.createdAt?.toISOString() ?? null,
      updatedAt: source.updatedAt?.toISOString() ?? null,
    };
  }
}
