"use strict";
(function()
{
	var game = {
		canvas: null,
		context: null,
		player: null,
		enemies: [],
		powerups: [],
		width: 1024,
		height: 768,
		level: 1,
		score: 0,
		elapsed: 0,
		playerSpeed: 500, // pixels per second
		spawnTimer: 0, // time left till next spawn
		spawnRate: 0.5, // seconds per spawn
		powerupTimer: 5, // time left till next powerup
		powerupRate: 3 // seconds per spawn
	};

	var lastFrame = 0;

	var requestAnimationFrame = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame;

	var performance = window.performance || window.msperformance || {};
	performance.now = performance.now || performance.webkitNow || Date.now;

	var setup = function()
	{
		game.canvas = document.createElement("canvas");
		game.canvas.width = game.width;
		game.canvas.height = game.height;
		game.context = game.canvas.getContext("2d");
		game.context.fillStyle = "black";
		game.context.strokeStyle = "white";
		document.documentElement.appendChild(game.canvas);
		game.canvas.addEventListener("mousemove", updatePlayerTarget);
	};

	var reset = function()
	{
		game.level = 1;
		game.player = {
			x: game.width / 2,
			y: game.height / 2,
			radius: 20,
			destination: {
				x: game.width / 2,
				y: game.height / 2
			}
		};
		game.score = 0;
		game.enemies = [];
		game.spawnTimer = 0;
		lastFrame = performance.now();
	};

	var main = function()
	{
		if(game.player.radius > game.width / 2)
		{
			return gameOver();
		}
		requestAnimationFrame(main);
		var currentFrame = performance.now();
		game.elapsed = Math.min((currentFrame - lastFrame) / 1000, 1/10);
		game.score += game.elapsed * 5 * Math.pow(game.player.radius / 20, 2);
		lastFrame = currentFrame;
		updateEnemies();
		updatePowerups();
		updatePlayer();
		draw();
	};

	var gameOver = function()
	{
		alert("Game over! You scored " + Math.round(game.score));
		reset();
		main();
	};

	var Enemy = function()
	{
		var side = Math.floor(Math.random() * 4);
		var proportion = Math.random() * 0.8 + 0.1;
		var destProportion = Math.random() * 0.8 + 0.1;

		this.width = 10;
		this.height = 10;
		this.x = -this.width;
		this.y = -this.height;
		this.speed = 150;
		this.colour = "red";
		this.destination = {
			x: -this.width,
			y: -this.height
		};

		switch(side)
		{
		case 0: // Top
			this.x = game.width * proportion;
			this.destination.x = game.width * destProportion;
			this.destination.y = game.height;
			break;
		case 1: // Bottom
			this.x = game.width * proportion;
			this.y = game.height;
			this.destination.x = game.width * destProportion;
			break;
		case 2: // Left
			this.y = game.height * proportion;
			this.destination.y = game.height * destProportion;
			this.destination.x = game.width;
			break;
		case 3: // Right
			this.y = game.height * proportion;
			this.x = game.width;
			this.destination.y = game.height * destProportion;
			break;
		}
	};

	var Powerup = function()
	{
		Enemy.call(this);
		this.colour = "blue";
	};

	var updateEnemies = function()
	{
		game.spawnTimer -= game.elapsed;
		var destroy = [];
		var i;

		if(game.spawnTimer < 0)
		{
			game.spawnTimer += game.spawnRate;
			game.enemies.push(new Enemy());
		}

		for(i = game.enemies.length - 1; i >= 0; i--)
		{
			var enemy = game.enemies[i];
			move(enemy, enemy.speed);
			if(enemy.x === enemy.destination.x && enemy.y === enemy.destination.y)
			{
				destroy.push(i);
			}
			if(collide(enemy))
			{
				game.player.radius *= 1.1;
				destroy.push(i);
			}
		}
		for(i = 0; i < destroy.length; i++)
		{
			game.enemies.splice(destroy[i], 1);
		}
	};

	var updatePowerups = function()
	{
		game.powerupTimer -= game.elapsed;
		var destroy = [];
		var i;

		if(game.powerupTimer < 0)
		{
			game.powerupTimer += game.powerupRate;
			game.powerups.push(new Powerup());
		}

		for(i = game.powerups.length - 1; i >= 0; i--)
		{
			var powerup = game.powerups[i];
			move(powerup, powerup.speed);
			if(powerup.x === powerup.destination.x && powerup.y === powerup.destination.y)
			{
				destroy.push(i);
			}
			if(collide(powerup))
			{
				game.player.radius /= 1.15;
				destroy.push(i);
			}
		}
		for(i = 0; i < destroy.length; i++)
		{
			game.powerups.splice(destroy[i], 1);
		}
	};

	var collide = function(enemy)
	{
		if(
			enemy.x + enemy.width < game.player.x - game.player.radius ||
			enemy.x > game.player.x + game.player.radius ||
			enemy.y + enemy.height < game.player.y - game.player.radius ||
			enemy.y > game.player.y + game.player.radius
		)
		{
			return false;
		}

		// TODO: proper circle/square collision
		return true;
	};

	var updatePlayer = function()
	{
		var frames = Math.round(game.elapsed * 30);
		game.player.radius *= Math.pow(1.001, frames);
		move(game.player, game.playerSpeed);
	};

	var move = function(entity, speed)
	{
		var distance = Math.sqrt(
			Math.pow(entity.destination.x - entity.x, 2) +
			Math.pow(entity.destination.y - entity.y, 2)
		);
		var maxDistance = speed * game.elapsed;
		var proportion = 1;
		if(distance > maxDistance) proportion = maxDistance / distance;
		if(distance === 0) proportion = 0;

		entity.x += (entity.destination.x - entity.x) * proportion;
		entity.y += (entity.destination.y - entity.y) * proportion;
	};

	var updatePlayerTarget = function(event)
	{
		// Removed a lot of compatibility code. We're never going to be IE6
		// compatibile elsewhere in the code, so why bother here?
		var posx = event.pageX;
		var posy = event.pageY;

		// We have the position relative to the page
		// Now to get it relative to our element
		var rect = game.canvas.getBoundingClientRect();
		posx -= (rect.left + window.scrollX);
		posy -= (rect.top + window.scrollY);

		game.player.destination.x = posx;
		game.player.destination.y = posy;
	};

	var draw = function()
	{
		var i;

		game.context.fillRect(0, 0, game.width, game.height);
		game.context.save();
		game.context.fillStyle = "white";
		game.context.beginPath();
		game.context.arc(game.player.x, game.player.y, game.player.radius, 0, Math.PI * 2, true);
		game.context.closePath();
		game.context.fill();

		game.context.fillText(Math.round(game.score), game.width - 200, 50);

		game.context.fillStyle = "red";
		for(i = 0; i < game.enemies.length; i++)
		{
			var enemy = game.enemies[i];
			game.context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
		}

		for(i = 0; i < game.powerups.length; i++)
		{
			var powerup = game.powerups[i];
			game.context.fillStyle = powerup.colour;
			game.context.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);
		}

		game.context.restore();
	};

	alert("Blue is good, red is bad. Ready?");

	setup();
	reset();
	main();
})();
