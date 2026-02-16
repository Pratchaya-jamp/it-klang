using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using StockApi.Config;
using StockApi.Repositories;
using StockApi.Data;
using StockApi.Services;
using StockApi.Middlewares;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;

var builder = WebApplication.CreateBuilder(args);

// 1. Load .env
Env.Load();
Console.WriteLine($"Current Directory: {Directory.GetCurrentDirectory()}");
Console.WriteLine($"Check .env file: {File.Exists(".env")}");

var jwtKey = Env.GetString("JWT_KEY");
var jwtIssuer = Env.GetString("JWT_ISSUER");

if (string.IsNullOrEmpty(jwtKey))
{
    Console.WriteLine("❌ Error: JWT_KEY not found in .env");
}

// 2. Setup Database (MySQL)
var connectionString = $"server={Env.GetString("DB_HOST")};" +
                       $"port={Env.GetString("DB_PORT")};" +
                       $"database={Env.GetString("DB_NAME")};" +
                       $"user={Env.GetString("DB_USER")};" +
                       $"password={Env.GetString("DB_PASS")};" +
                       $"pooling={Env.GetString("DB_POOLING")};" +
                       $"minPoolSize={Env.GetString("DB_MIN_POOL")};" +
                       $"maximumPoolSize={Env.GetString("DB_MAX_POOL")};";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // <-- ใส่ URL Frontend ของคุณ (Vue/React)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // <--- *** สำคัญที่สุด! ถ้าไม่มีบรรทัดนี้ Cookie จะไม่ส่งไป ***
    });
});

// 3. Register Layers (Dependency Injection)
builder.Services.AddScoped<IItemRepository, ItemRepository>();
builder.Services.AddScoped<IItemService, ItemService>();
builder.Services.AddScoped<IStockRepository, StockRepository>();
builder.Services.AddScoped<IStockService, StockService>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();
builder.Services.AddScoped<ISystemLogRepository, SystemLogRepository>();
builder.Services.AddScoped<IAuditService, AuditService>();
// builder.Services.AddScoped<IEmailService, StockApi.Services.MockEmailService>();
builder.Services.AddScoped<IEmailService, StockApi.Services.GmailService>();
builder.Services.AddScoped<IAuthService, StockApi.Services.AuthService>();
builder.Services.AddHttpContextAccessor();

// Config JWT
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        // 1. Config การตรวจ Token (เหมือนเดิม)
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = false,
            RoleClaimType = "role",
            NameClaimType = "name",

            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        // 2. *** แก้ตรงนี้: ใส่ async / await ให้ชัดเจน ***
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // ลองหา Cookie ชื่อ "jwt"
                var token = context.Request.Cookies["accessToken"];

                // ถ้ามี ให้เอาไปใช้เป็น Token เลย
                if (!string.IsNullOrEmpty(token))
                {
                    context.Token = token;
                }

                return Task.CompletedTask;
            },

            // กรณี: ไม่ได้แนบ Token หรือ Token ผิด (401)
            OnChallenge = async context => // <--- เติม async ตรงนี้
            {
                // สั่งหยุด Default Behavior (ที่ทำให้หน้าขาว)
                context.HandleResponse();

                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";

                var result = System.Text.Json.JsonSerializer.Serialize(new
                {
                    status = 401,
                    message = "กรุณาเข้าสู่ระบบก่อนใช้งาน (Token Missing or Invalid)",
                    detail = context.ErrorDescription
                });

                // สั่งเขียนแล้วรอจนเสร็จ
                await context.Response.WriteAsync(result);
            },

            // กรณี: ไม่มีสิทธิ์ (403)
            OnForbidden = async context => // <--- เติม async ตรงนี้
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";

                var result = System.Text.Json.JsonSerializer.Serialize(new
                {
                    status = 403,
                    message = "คุณไม่มีสิทธิ์ใช้งานส่วนนี้ (Access Denied)"
                });

                await context.Response.WriteAsync(result);
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SuperAdminOnly", policy =>
        policy.RequireClaim("role", "SuperAdmin")); // เช็ค key "role" ต้องมีค่า "SuperAdmin"
});

// 4. Setup Swagger & Controllers
builder.Services.AddControllers(options =>
{
    var policy = new AuthorizationPolicyBuilder()
                     .RequireAuthenticatedUser()
                     .Build();

    options.Filters.Add(new AuthorizeFilter(policy));
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // 1. กำหนดรูปแบบความปลอดภัย (บอก Swagger ว่าเราใช้ JWT)
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "ใส่ Token ที่ได้จากการ Login ลงในช่องนี้ได้เลย (ไม่ต้องพิมพ์คำว่า Bearer นำหน้า)"
    });

    // 2. บังคับใช้ความปลอดภัยนี้กับทุก Endpoint
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

builder.Services.AddMemoryCache();

var app = builder.Build();

// 5. Run Middleware
app.UseMiddleware<GlobalExceptionMiddleware>();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Stock API v1");
        options.RoutePrefix = string.Empty; // เปิดมาเจอ Swagger เลย
    });
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        // เรียกฟังก์ชันที่เราเพิ่งสร้าง
        await DataSeeder.SeedUsersAsync(services);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error Seeding Data: {ex.Message}");
    }
}

app.UseMiddleware<StockApi.Middlewares.RequestLoggingMiddleware>();
app.MapControllers();

// สร้าง Scope ชั่วคราวเพื่อเรียกใช้ Database ตอนเริ่มโปรแกรม
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();

        // เรียกฟังก์ชันอุ่นเครื่องที่เราเขียนเมื่อกี้
        StockApi.Utilities.DbInitializer.Initialize(context);

        Console.WriteLine("🔥 Database Pre-warmed successfully!");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ Warmup Error: {ex.Message}");
    }
}

app.Run();