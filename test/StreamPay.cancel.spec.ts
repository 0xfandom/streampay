import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StreamPay - Cancel (Issue #7)", function () {
  async function deployFixture() {
    const [sender, recipient, other] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const StreamPay = await ethers.getContractFactory("StreamPay");
    const sp = await StreamPay.deploy();
    await sp.waitForDeployment();

    const deposit = ethers.parseEther("100");
    await token.mint(sender.address, deposit);
    await token.connect(sender).approve(await sp.getAddress(), deposit);

    const now = await time.latest();
    const start = now + 10;
    const cliff = start + 50;
    const end = start + 200;

    await sp.connect(sender).createStream(
      await token.getAddress(),
      recipient.address,
      deposit,
      start,
      cliff,
      end,
      true
    );

    return { sp, token, sender, recipient, other, deposit, cliff };
  }

  it("sender can cancel cancelable stream", async function () {
    const { sp, sender } = await deployFixture();

    await expect(
      sp.connect(sender).cancel(1)
    ).to.emit(sp, "Canceled");
  });

  it("non-sender cannot cancel", async function () {
    const { sp, other } = await deployFixture();

    await expect(
      sp.connect(other).cancel(1)
    ).to.be.reverted;
  });

  it("cannot cancel twice", async function () {
    const { sp, sender } = await deployFixture();

    await sp.connect(sender).cancel(1);

    await expect(
      sp.connect(sender).cancel(1)
    ).to.be.reverted;
  });

  it("refunds unvested tokens to sender", async function () {
    const { sp, token, sender, cliff } = await deployFixture();

    await time.increaseTo(cliff + 20);

    const senderBalanceBefore = await token.balanceOf(sender.address);

    await sp.connect(sender).cancel(1);

    const senderBalanceAfter = await token.balanceOf(sender.address);

    expect(senderBalanceAfter).to.be.greaterThan(senderBalanceBefore);
  });

  it("recipient can still withdraw vested after cancel", async function () {
    const { sp, recipient, cliff } = await deployFixture();

    await time.increaseTo(cliff + 20);

    await sp.cancel(1);

    const withdrawable = await sp.withdrawableAmount(1);
    expect(withdrawable).to.be.greaterThan(0n);

    await sp.connect(recipient).withdraw(1, withdrawable);

    expect(await sp.withdrawableAmount(1)).to.equal(0n);
  });

  it("vesting does not increase after cancellation", async function () {
    const { sp, sender, cliff } = await deployFixture();

    await time.increaseTo(cliff + 10);

    await sp.connect(sender).cancel(1);

    const vestedAfterCancel = await sp.withdrawableAmount(1);

    await time.increase(1000);

    const vestedLater = await sp.withdrawableAmount(1);

    expect(vestedLater).to.equal(vestedAfterCancel);
  });
});
