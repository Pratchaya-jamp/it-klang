using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using StockApi.Config;
using StockApi.Repositories;
using StockApi.Services;

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
app.MapControllers();

app.Run();