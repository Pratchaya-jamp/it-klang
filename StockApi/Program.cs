using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using StockApi.Config;
using StockApi.Repositories;
using StockApi.Services;
using StockApi.Middlewares;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Load .env
Env.Load();

// 2. Setup Database (MySQL)
var connectionString = $"server={Env.GetString("DB_HOST")};" +
                       $"port={Env.GetString("DB_PORT")};" +
                       $"database={Env.GetString("DB_NAME")};" +
                       $"user={Env.GetString("DB_USER")};" +
                       $"password={Env.GetString("DB_PASS")};";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

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

// Config JWT
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                builder.Configuration.GetSection("Jwt:Key").Value!
            )),

            // --- เพิ่มการตรวจสอบ Issuer ---
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],

            ValidateAudience = false,

            // *** สำคัญ: บอกระบบว่า Claim ไหนคือ Role ***
            RoleClaimType = "role", // บอกว่าถ้าจะเช็ค Role ให้ดูที่ key ชื่อ "role" นะ
            NameClaimType = "name"  // บอกว่าถ้าจะเช็ค User.Identity.Name ให้ดูที่ "name"
        };
    });

// 4. Setup Swagger & Controllers
builder.Services.AddControllers();
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

app.UseAuthorization();
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