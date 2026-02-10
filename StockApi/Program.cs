using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using StockApi.Config;
using StockApi.Repositories;
using StockApi.Services;
using StockApi.Middlewares;

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

// 4. Setup Swagger & Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Stock Enterprise API",
        Version = "v1",
        Description = "API ระบบจัดการ Stock"
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